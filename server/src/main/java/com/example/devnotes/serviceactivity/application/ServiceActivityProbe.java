package com.example.devnotes.serviceactivity.application;

import com.example.devnotes.serviceactivity.domain.ProbeResult;
import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Internal probe of the service's own public readiness (S-111, T-054).
 *
 * <p>The destination is derived only from the validated {@code APP_PUBLIC_URL} plus the fixed readiness path: never
 * from a request, a header or the browser. A configured origin that is not a public HTTPS host leaves the probe
 * unconfigured, so the capability stays unavailable and nothing goes to the network. Plain HTTP to loopback is
 * accepted only for local OIDC profiles (test/e2e), where the transport is replaced by a controlled fixture.
 */
public final class ServiceActivityProbe {

    public static final String READINESS_PATH = "/actuator/health/readiness";

    private static final Pattern NUMERIC_HOST = Pattern.compile("[0-9.]+");
    private static final Pattern IPV4 = Pattern.compile("\\d{1,3}(\\.\\d{1,3}){3}");

    /** Sends one bounded GET to the fixed target and classifies the answer; implementations never throw. */
    @FunctionalInterface
    public interface Transport {
        ProbeResult probe(URI target);
    }

    private final URI target;
    private final Transport transport;

    private ServiceActivityProbe(URI target, Transport transport) {
        this.target = target;
        this.transport = transport;
    }

    public static ServiceActivityProbe of(URI publicOrigin, boolean localProfile, Transport transport) {
        return new ServiceActivityProbe(target(publicOrigin, localProfile).orElse(null), transport);
    }

    /** True when a valid destination exists; otherwise the capability is unavailable and no request is sent. */
    public boolean configured() {
        return target != null;
    }

    /** One attempt against the fixed destination; {@code UNAVAILABLE} without network when not configured. */
    public ProbeResult probe() {
        if (target == null) {
            return ProbeResult.UNAVAILABLE;
        }
        ProbeResult result;
        try {
            result = transport.probe(target);
        } catch (RuntimeException unexpected) {
            return ProbeResult.UNAVAILABLE;
        }
        return result == null || result == ProbeResult.NONE ? ProbeResult.UNAVAILABLE : result;
    }

    /**
     * Fixed readiness URL for a public origin, or empty when the origin is unusable: not HTTPS, credentials, query,
     * fragment or path, or a loopback, private, link-local, metadata or otherwise internal host. No DNS lookups: only
     * literal addresses are classified, and well-known internal names are rejected by suffix.
     */
    public static Optional<URI> target(URI origin, boolean localProfile) {
        if (origin == null
                || !origin.isAbsolute()
                || origin.getScheme() == null
                || origin.getHost() == null
                || origin.getRawUserInfo() != null
                || origin.getRawQuery() != null
                || origin.getRawFragment() != null
                || (origin.getRawPath() != null && !origin.getRawPath().isEmpty())) {
            return Optional.empty();
        }
        String scheme = origin.getScheme().toLowerCase(Locale.ROOT);
        String host = origin.getHost().toLowerCase(Locale.ROOT);
        boolean loopback = isLoopback(host);
        boolean allowed = localProfile
                ? loopback && (scheme.equals("http") || scheme.equals("https"))
                : scheme.equals("https") && isPublicHost(host);
        if (!allowed) {
            return Optional.empty();
        }
        String port = origin.getPort() == -1 ? "" : ":" + origin.getPort();
        return Optional.of(URI.create(scheme + "://" + host + port + READINESS_PATH));
    }

    private static boolean isLoopback(String host) {
        if (host.equals("localhost")) {
            return true;
        }
        return literal(host).map(InetAddress::isLoopbackAddress).orElse(false);
    }

    private static boolean isPublicHost(String host) {
        String name = host.endsWith(".") ? host.substring(0, host.length() - 1) : host;
        if (name.startsWith("[") || NUMERIC_HOST.matcher(name).matches()) {
            return literal(name).map(ServiceActivityProbe::isPublicAddress).orElse(false);
        }
        int dot = name.lastIndexOf('.');
        if (dot <= 0 || dot == name.length() - 1) {
            return false; // single-label names resolve through local search domains
        }
        String tld = name.substring(dot + 1);
        if (tld.chars().allMatch(Character::isDigit)) {
            return false;
        }
        return !(name.equals("localhost")
                || name.endsWith(".localhost")
                || name.endsWith(".local")
                || name.endsWith(".internal")
                || name.endsWith(".home.arpa")
                || name.endsWith(".lan")
                || name.equals("metadata.google.internal"));
    }

    /** Parses only literal IPv4/IPv6 hosts (no resolution); anything else is empty. */
    private static Optional<InetAddress> literal(String host) {
        try {
            if (host.startsWith("[") && host.endsWith("]")) {
                String inner = host.substring(1, host.length() - 1);
                return inner.contains(":") ? Optional.of(InetAddress.getByName(inner)) : Optional.empty();
            }
            if (IPV4.matcher(host).matches()) {
                return Optional.of(InetAddress.getByName(host));
            }
            return Optional.empty();
        } catch (UnknownHostException invalid) {
            return Optional.empty();
        }
    }

    private static boolean isPublicAddress(InetAddress address) {
        if (address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return false;
        }
        byte[] bytes = address.getAddress();
        if (address instanceof Inet4Address) {
            int first = bytes[0] & 0xff;
            int second = bytes[1] & 0xff;
            boolean thisNetwork = first == 0;
            boolean carrierGradeNat = first == 100 && second >= 64 && second <= 127;
            boolean benchmarking = first == 198 && (second == 18 || second == 19);
            boolean reserved = first >= 240;
            return !(thisNetwork || carrierGradeNat || benchmarking || reserved);
        }
        if (address instanceof Inet6Address) {
            boolean uniqueLocal = (bytes[0] & 0xfe) == 0xfc;
            boolean documentation = (bytes[0] & 0xff) == 0x20
                    && (bytes[1] & 0xff) == 0x01
                    && bytes[2] == 0x0d
                    && (bytes[3] & 0xff) == 0xb8;
            return !(uniqueLocal || documentation);
        }
        return false;
    }
}
