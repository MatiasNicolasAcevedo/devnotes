package com.example.devnotes.ai;

import com.example.devnotes.identity.IdentityService;
import com.example.devnotes.security.AuthOpenApi;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AiProperties.class)
class AiConfiguration {
    @Bean
    OpenApiCustomizer aiOpenApiCustomizer() {
        return api -> api.getPaths()
                .get(AiController.MESSAGES)
                .getPost()
                .setSecurity(List.of(new SecurityRequirement()
                        .addList(AuthOpenApi.SESSION_COOKIE)
                        .addList(AuthOpenApi.CSRF_HEADER)));
    }

    @Bean
    AiHttp aiHttp(Clock clock) {
        return new AiHttp(
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(5))
                        .followRedirects(HttpClient.Redirect.NEVER)
                        .build(),
                clock);
    }

    @Bean
    AiMessageService aiMessageService(
            AiProperties properties,
            AiNoteContext context,
            AiHttp http,
            Clock clock,
            Environment env,
            IdentityService identities) {
        boolean useDouble = properties.testProvider() && env.acceptsProfiles(Profiles.of("e2e & !google"));
        var workers = properties.provider(AiOptions.WORKERS);
        var openRouterClient = new OpenRouterAiClient(
                http,
                base(useDouble, "https://openrouter.ai"),
                properties.provider(AiOptions.OPENROUTER).key());
        var openRouter = new OpenRouterCatalog(openRouterClient, clock);
        var clients = Map.<String, AiClient>of(
                AiOptions.GROQ,
                        new GroqAiClient(
                                http,
                                base(useDouble, "https://api.groq.com"),
                                properties.provider(AiOptions.GROQ).key()),
                AiOptions.WORKERS,
                        new WorkersAiClient(
                                http,
                                base(useDouble, "https://api.cloudflare.com"),
                                workers.accountId(),
                                workers.key()),
                AiOptions.GEMINI,
                        new GeminiAiClient(
                                http,
                                base(useDouble, "https://generativelanguage.googleapis.com"),
                                properties.provider(AiOptions.GEMINI).key()),
                AiOptions.OPENROUTER, openRouter);
        return new AiMessageService(
                properties, new AiOptions(properties, openRouter), context, clients, useDouble, identities::subject);
    }

    private static URI base(boolean useDouble, String production) {
        return URI.create(useDouble ? "http://voice-provider:8091" : production);
    }
}
