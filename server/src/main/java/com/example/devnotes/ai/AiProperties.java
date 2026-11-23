package com.example.devnotes.ai;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("devnotes.ai")
record AiProperties(boolean enabled, UUID pilotId, boolean testProvider, Map<String, Provider> providers) {
    AiProperties {
        providers = providers == null ? Map.of() : Map.copyOf(providers);
    }

    Provider provider(String id) {
        return providers.getOrDefault(id, new Provider(false, "", "", List.of()));
    }

    record Provider(boolean enabled, String key, String accountId, List<String> excerptScopes) {
        Provider {
            key = key == null ? "" : key;
            accountId = accountId == null ? "" : accountId;
            excerptScopes = excerptScopes == null ? List.of() : List.copyOf(excerptScopes);
        }

        boolean permits(String space, String source) {
            return excerptScopes.contains(space + "/" + source);
        }

        @Override
        public String toString() {
            return "AiProviderConfiguration";
        }
    }
}
