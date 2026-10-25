package com.example.devnotes.daily.web;

import com.example.devnotes.security.AuthOpenApi;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class DailyVersionOpenApi {
    @Bean
    OpenApiCustomizer dailyVersionOpenApiCustomizer() {
        return api -> {
            var item = api.getPaths().get("/api/v1/daily-notes/{date}/version");
            if (item != null && item.getPost() != null) {
                // Both protections are required together, never alternative authentication schemes.
                item.getPost()
                        .setSecurity(List.of(new SecurityRequirement()
                                .addList(AuthOpenApi.SESSION_COOKIE)
                                .addList(AuthOpenApi.CSRF_HEADER)));
            }
        };
    }
}
