package com.example.devnotes.serviceactivity;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.serviceactivity.application.ServiceActivityProbe;
import com.example.devnotes.serviceactivity.domain.ProbeResult;
import com.example.devnotes.serviceactivity.infrastructure.HttpProbeTransport;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Probe destination and bounded transport (S-111, T-054). The transport only talks to a controlled HTTP server on the
 * loopback interface of this test; no external request is ever made.
 */
class ServiceActivityProbeTest {

    private static final Duration TEST_DEADLINE = Duration.ofMillis(800);
    private static final String UP = "{\"status\":\"UP\"}";

    private HttpServer server;
    private HttpProbeTransport transport;
    private final Map<String, HttpHandler> routes = new ConcurrentHashMap<>();
    private final List<Map<String, List<String>>> requestHeaders = new CopyOnWriteArrayList<>();
    private final List<String> requestLines = new CopyOnWriteArrayList<>();
    private final AtomicInteger elsewhereHits = new AtomicInteger();

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.setExecutor(Executors.newCachedThreadPool());
        server.createContext("/", exchange -> {
            requestLines.add(exchange.getRequestMethod() + " " + exchange.getRequestURI());
            requestHeaders.add(Map.copyOf(exchange.getRequestHeaders()));
            HttpHandler handler =
                    routes.getOrDefault(exchange.getRequestURI().getPath(), ex -> send(ex, 404, "text/plain", "x"));
            try {
                handler.handle(exchange);
            } catch (IOException closed) {
                // The client may abort a slow or oversized answer.
            } finally {
                exchange.close();
            }
        });
        server.start();
        transport = new HttpProbeTransport(HttpProbeTransport.client(Duration.ofMillis(500)), TEST_DEADLINE, 1024);
    }

    @AfterEach
    void stopServer() {
        transport.close();
        server.stop(0);
    }

    // ── Destination ──

    @Test
    void publicHttpsOriginGetsTheFixedReadinessPath() {
        assertThat(ServiceActivityProbe.target(URI.create("https://devnotes-pilot.onrender.com"), false))
                .contains(URI.create("https://devnotes-pilot.onrender.com/actuator/health/readiness"));
        assertThat(ServiceActivityProbe.target(URI.create("https://Notes.Example.com:8443"), false))
                .contains(URI.create("https://notes.example.com:8443/actuator/health/readiness"));
        assertThat(ServiceActivityProbe.target(URI.create("https://93.184.215.14"), false))
                .contains(URI.create("https://93.184.215.14/actuator/health/readiness"));
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "http://devnotes.example.com",
                "ftp://devnotes.example.com",
                "https://user:secret@devnotes.example.com",
                "https://devnotes.example.com?next=https://attacker.example",
                "https://devnotes.example.com#fragment",
                "https://devnotes.example.com/redirect",
                "https://devnotes.example.com/",
                "https://localhost",
                "https://app.localhost",
                "https://127.0.0.1",
                "https://127.1",
                "https://2130706433",
                "https://[::1]",
                "https://[::ffff:127.0.0.1]",
                "https://0.0.0.0",
                "https://10.1.2.3",
                "https://172.16.0.1",
                "https://192.168.1.10",
                "https://169.254.169.254",
                "https://100.64.0.1",
                "https://[fe80::1]",
                "https://[fd00::1]",
                "https://[::ffff:10.0.0.1]",
                "https://metadata.google.internal",
                "https://db.internal",
                "https://printer.local",
                "https://router.home.arpa",
                "https://intranet",
                "https://224.0.0.1",
                "https://255.255.255.255"
            })
    void unusableOriginsLeaveTheProbeUnconfigured(String origin) {
        assertThat(ServiceActivityProbe.target(URI.create(origin), false)).isEmpty();
        var probe = ServiceActivityProbe.of(URI.create(origin), false, target -> {
            throw new AssertionError("no request may be sent without a valid destination");
        });
        assertThat(probe.configured()).isFalse();
        assertThat(probe.probe()).isEqualTo(ProbeResult.UNAVAILABLE);
    }

    @Test
    void loopbackHttpIsOnlyAcceptedForLocalProfilesAndPrivateHostsNeverAre() {
        assertThat(ServiceActivityProbe.target(URI.create("http://127.0.0.1:5173"), true))
                .contains(URI.create("http://127.0.0.1:5173/actuator/health/readiness"));
        assertThat(ServiceActivityProbe.target(URI.create("http://localhost:5174"), true))
                .isPresent();
        assertThat(ServiceActivityProbe.target(URI.create("http://127.0.0.1:5173"), false))
                .isEmpty();
        assertThat(ServiceActivityProbe.target(URI.create("http://10.0.0.2:5173"), true))
                .isEmpty();
        assertThat(ServiceActivityProbe.target(URI.create("https://devnotes.example.com"), true))
                .isEmpty();
        assertThat(ServiceActivityProbe.target(null, false)).isEmpty();
    }

    // ── Transport ──

    @Test
    void http200WithJsonUpIsTheOnlySuccess() {
        routes.put(
                "/actuator/health/readiness", ex -> send(ex, 200, "application/vnd.spring-boot.actuator.v3+json", UP));

        assertThat(transport.probe(target())).isEqualTo(ProbeResult.UP);
        assertThat(requestLines).containsExactly("GET /actuator/health/readiness");
    }

    @Test
    void theSentRequestCarriesNoCookiesCredentialsOrCsrfEvenAfterTheServerSetsACookie() {
        routes.put("/actuator/health/readiness", ex -> {
            ex.getResponseHeaders().add("Set-Cookie", "JSESSIONID=fixture; Path=/");
            send(ex, 200, "application/json", UP);
        });

        assertThat(transport.probe(target())).isEqualTo(ProbeResult.UP);
        assertThat(transport.probe(target())).isEqualTo(ProbeResult.UP);

        assertThat(requestHeaders)
                .hasSize(2)
                .allSatisfy(headers -> assertThat(headers.keySet())
                        .noneMatch(name -> name.equalsIgnoreCase("Cookie")
                                || name.equalsIgnoreCase("Authorization")
                                || name.toLowerCase().contains("xsrf")
                                || name.toLowerCase().contains("csrf")));
    }

    @Test
    void readinessDownOrNonJsonOrStartupHtmlIsAnInvalidResponse() {
        routes.put("/down", ex -> send(ex, 200, "application/json", "{\"status\":\"DOWN\"}"));
        routes.put("/html", ex -> send(ex, 200, "text/html", "<html><body>Service waking up</body></html>"));
        routes.put("/array", ex -> send(ex, 200, "application/json", "[\"UP\"]"));
        routes.put("/number", ex -> send(ex, 200, "application/json", "{\"status\":1}"));
        routes.put("/empty", ex -> send(ex, 200, "application/json", ""));

        for (String path : List.of("/down", "/html", "/array", "/number", "/empty")) {
            assertThat(transport.probe(at(path))).as(path).isEqualTo(ProbeResult.INVALID_RESPONSE);
        }
    }

    @Test
    void serverErrorsAndClientErrorsAreHttpErrors() {
        routes.put("/actuator/health/readiness", ex -> send(ex, 503, "application/json", "{\"status\":\"DOWN\"}"));
        routes.put("/missing", ex -> send(ex, 404, "text/html", "<html>no</html>"));

        assertThat(transport.probe(target())).isEqualTo(ProbeResult.HTTP_ERROR);
        assertThat(transport.probe(at("/missing"))).isEqualTo(ProbeResult.HTTP_ERROR);
    }

    @Test
    void redirectsAreFailuresAndAreNeverFollowed() {
        routes.put("/actuator/health/readiness", ex -> {
            ex.getResponseHeaders().add("Location", "/elsewhere");
            send(ex, 302, "text/plain", "");
        });
        routes.put("/elsewhere", ex -> {
            elsewhereHits.incrementAndGet();
            send(ex, 200, "application/json", UP);
        });

        assertThat(transport.probe(target())).isEqualTo(ProbeResult.HTTP_ERROR);
        assertThat(elsewhereHits).hasValue(0);
    }

    @Test
    void aSlowAnswerTimesOutWithinTheDeadline() {
        routes.put("/actuator/health/readiness", ex -> {
            sleep(TEST_DEADLINE.multipliedBy(3));
            send(ex, 200, "application/json", UP);
        });

        long started = System.nanoTime();
        assertThat(transport.probe(target())).isEqualTo(ProbeResult.TIMEOUT);
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(TEST_DEADLINE.multipliedBy(2));
    }

    @Test
    void aBodyThatKeepsDrippingIsCutByTheWholeOperationDeadline() {
        routes.put("/actuator/health/readiness", ex -> {
            ex.getResponseHeaders().add("Content-Type", "application/json");
            ex.sendResponseHeaders(200, 0);
            OutputStream body = ex.getResponseBody();
            for (int i = 0; i < 40; i++) {
                body.write(' ');
                body.flush();
                sleep(Duration.ofMillis(100));
            }
            body.write(UP.getBytes(StandardCharsets.UTF_8));
        });

        long started = System.nanoTime();
        assertThat(transport.probe(target())).isEqualTo(ProbeResult.TIMEOUT);
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(TEST_DEADLINE.multipliedBy(2));
    }

    @Test
    void aBodyOverOneKibibyteIsInvalidEvenIfItSaysUp() {
        String padded = "{\"status\":\"UP\",\"pad\":\"" + "x".repeat(1100) + "\"}";
        String exact = "{\"status\":\"UP\",\"p\":\"" + "x".repeat(1024 - 20 - 2) + "\"}";
        assertThat(exact.getBytes(StandardCharsets.UTF_8)).hasSize(1024);
        routes.put("/big", ex -> send(ex, 200, "application/json", padded));
        routes.put("/exact", ex -> send(ex, 200, "application/json", exact));
        routes.put("/endless", ex -> {
            ex.getResponseHeaders().add("Content-Type", "application/json");
            ex.sendResponseHeaders(200, 0);
            OutputStream body = ex.getResponseBody();
            body.write("{\"status\":\"UP\",\"pad\":\"".getBytes(StandardCharsets.UTF_8));
            byte[] chunk = "y".repeat(4096).getBytes(StandardCharsets.UTF_8);
            for (int i = 0; i < 4096; i++) {
                body.write(chunk);
            }
        });

        assertThat(transport.probe(at("/big"))).isEqualTo(ProbeResult.INVALID_RESPONSE);
        assertThat(transport.probe(at("/endless"))).isEqualTo(ProbeResult.INVALID_RESPONSE);
        assertThat(transport.probe(at("/exact"))).isEqualTo(ProbeResult.UP);
    }

    @Test
    void aRefusedConnectionIsUnavailable() throws IOException {
        int closedPort;
        try (var socket = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            closedPort = socket.getLocalPort();
        }

        assertThat(transport.probe(URI.create("http://127.0.0.1:" + closedPort + "/actuator/health/readiness")))
                .isEqualTo(ProbeResult.UNAVAILABLE);
    }

    @Test
    void theProbeDelegatesOnlyTheFixedTargetToItsTransport() {
        routes.put("/actuator/health/readiness", ex -> send(ex, 200, "application/json", UP));
        var probe = ServiceActivityProbe.of(origin(), true, transport);

        assertThat(probe.configured()).isTrue();
        assertThat(probe.probe()).isEqualTo(ProbeResult.UP);
        assertThat(requestLines).containsExactly("GET /actuator/health/readiness");
        assertThat(ServiceActivityProbe.of(origin(), true, target -> null).probe())
                .isEqualTo(ProbeResult.UNAVAILABLE);
    }

    @Test
    void productionLimitsMatchTheContract() {
        assertThat(HttpProbeTransport.CONNECT_TIMEOUT).isEqualTo(Duration.ofSeconds(5));
        assertThat(HttpProbeTransport.DEADLINE).isEqualTo(Duration.ofSeconds(15));
        assertThat(HttpProbeTransport.MAX_BODY_BYTES).isEqualTo(1024);
        var client = HttpProbeTransport.client(HttpProbeTransport.CONNECT_TIMEOUT);
        assertThat(client.followRedirects()).isEqualTo(java.net.http.HttpClient.Redirect.NEVER);
        assertThat(client.cookieHandler()).isEmpty();
        assertThat(client.authenticator()).isEmpty();
        assertThat(client.connectTimeout()).contains(Duration.ofSeconds(5));
        client.close();
    }

    // ── Helpers ──

    private URI origin() {
        return URI.create("http://127.0.0.1:" + server.getAddress().getPort());
    }

    private URI target() {
        return at(ServiceActivityProbe.READINESS_PATH);
    }

    private URI at(String path) {
        return URI.create(origin() + path);
    }

    private static void send(HttpExchange exchange, int status, String contentType, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", contentType);
        exchange.sendResponseHeaders(status, bytes.length == 0 ? -1 : bytes.length);
        if (bytes.length > 0) {
            exchange.getResponseBody().write(bytes);
        }
    }

    private static void sleep(Duration duration) {
        try {
            Thread.sleep(duration.toMillis());
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
    }
}
