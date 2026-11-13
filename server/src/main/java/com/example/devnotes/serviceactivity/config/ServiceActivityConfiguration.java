package com.example.devnotes.serviceactivity.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(ServiceActivityProperties.class)
public class ServiceActivityConfiguration {

    private static final Logger log = LoggerFactory.getLogger(ServiceActivityConfiguration.class);

    public ServiceActivityConfiguration(ServiceActivityProperties properties) {
        if (properties.misconfigured()) {
            // No values: the owner id is operator data and must not reach the logs.
            log.warn("Service activity is enabled without a valid owner id; the capability stays unavailable.");
        }
    }
}
