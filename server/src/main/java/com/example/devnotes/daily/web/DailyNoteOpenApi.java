package com.example.devnotes.daily.web;

import com.example.devnotes.security.AuthOpenApi;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class DailyNoteOpenApi {
    @Bean
    OpenApiCustomizer dailyNoteOpenApiCustomizer() {
        return api -> {
            var item = api.getPaths().get("/api/v1/daily-notes/{date}");
            if (item != null && item.getPut() != null) {
                requireSessionAndCsrf(item.getPut());
            }
            var copy = api.getPaths().get("/api/v1/daily-notes/{targetDate}/copy-previous");
            if (copy != null && copy.getPost() != null) {
                requireSessionAndCsrf(copy.getPost());
            }
        };
    }

    private void requireSessionAndCsrf(Operation operation) {
        operation.setSecurity(List.of(
                new SecurityRequirement().addList(AuthOpenApi.SESSION_COOKIE).addList(AuthOpenApi.CSRF_HEADER)));
    }
}
