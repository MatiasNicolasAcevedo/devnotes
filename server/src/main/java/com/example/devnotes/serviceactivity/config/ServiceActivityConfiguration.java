package com.example.devnotes.serviceactivity.config;

import com.example.devnotes.security.PublicOrigin;
import com.example.devnotes.serviceactivity.application.ServiceActivityProbe;
import com.example.devnotes.serviceactivity.infrastructure.HttpProbeTransport;
import java.util.Arrays;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

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

    /** Bounded JDK transport; replaced by a controlled fixture in tests, never pointed at a request URL. */
    @Bean
    ServiceActivityProbe.Transport serviceActivityProbeTransport() {
        return HttpProbeTransport.standard();
    }

    /** Fixed destination from the validated public origin; invalid means unavailable, never a startup failure. */
    @Bean
    ServiceActivityProbe serviceActivityProbe(
            PublicOrigin origin,
            Environment environment,
            ServiceActivityProperties properties,
            ServiceActivityProbe.Transport transport) {
        var probe = ServiceActivityProbe.of(origin.uri(), localProfile(environment), transport);
        if (properties.enabled() && !probe.configured()) {
            // No values: only that the public origin is not a public HTTPS host.
            log.warn("Service activity is enabled without a public HTTPS origin; the capability stays unavailable.");
        }
        return probe;
    }

    /**
     * One thread for the single probe sequence: one-shot cancelable tasks only. Declared as {@link TaskScheduler} so it
     * does not replace Boot's application task executor; tasks still pending at shutdown are dropped, not run.
     */
    @Bean
    TaskScheduler serviceActivityTaskScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("service-activity-");
        scheduler.setRemoveOnCancelPolicy(true);
        scheduler.setWaitForTasksToCompleteOnShutdown(false);
        scheduler.setAcceptTasksAfterContextClose(false);
        return scheduler;
    }

    /** Same rule as the OIDC registration: test/e2e are local profiles; google is the real configuration. */
    private static boolean localProfile(Environment environment) {
        Set<String> profiles = Set.copyOf(Arrays.asList(
                environment.getActiveProfiles().length == 0
                        ? environment.getDefaultProfiles()
                        : environment.getActiveProfiles()));
        return !profiles.contains("google") && (profiles.contains("test") || profiles.contains("e2e"));
    }
}
