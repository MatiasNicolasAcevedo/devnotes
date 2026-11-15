package com.example.devnotes.ocr;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.multipart.support.StandardServletMultipartResolver;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(OcrProperties.class)
class OcrConfiguration {
    @Bean
    StandardServletMultipartResolver multipartResolver() {
        // Keep the servlet limits for other uploads. OCR reads its own smaller budget after authentication.
        return new StandardServletMultipartResolver() {
            @Override
            public boolean isMultipart(HttpServletRequest request) {
                return !("POST".equals(request.getMethod())
                                && OcrController.EXTRACTIONS.equals(request.getServletPath()))
                        && super.isMultipart(request);
            }
        };
    }
}
