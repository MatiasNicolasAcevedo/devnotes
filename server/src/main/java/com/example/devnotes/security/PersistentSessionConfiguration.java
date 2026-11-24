package com.example.devnotes.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.web.servlet.DispatcherServlet;
import org.springframework.web.servlet.FlashMap;
import org.springframework.web.servlet.FlashMapManager;

/**
 * Spring Session JDBC cookie (T-099). Host-only {@code JSESSIONID}, {@code Path=/}, HttpOnly, SameSite=Lax and Secure
 * derived from {@code APP_PUBLIC_URL}. Pre-login correlation cookies stay browser-session cookies; the cookie written
 * by a valid login (rotated id) lasts 30 days, matching the server-side absolute limit.
 */
@Configuration(proxyBeanMethods = false)
public class PersistentSessionConfiguration {
    /**
     * Spring MVC's default {@code SessionFlashMapManager} calls {@code getSession(false)} on every request, which loads
     * the stored session and extends its inactivity window even on anonymous routes. DevNotes is a JSON API without
     * redirect attributes, so flash maps are disabled and only authenticated activity extends a session.
     */
    @Bean
    static BeanPostProcessor sessionlessFlashMaps() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String name) {
                if (DispatcherServlet.FLASH_MAP_MANAGER_BEAN_NAME.equals(name) && bean instanceof FlashMapManager) {
                    return new FlashMapManager() {
                        @Override
                        public FlashMap retrieveAndUpdate(HttpServletRequest request, HttpServletResponse response) {
                            return null;
                        }

                        @Override
                        public void saveOutputFlashMap(
                                FlashMap flashMap, HttpServletRequest request, HttpServletResponse response) {}
                    };
                }
                return bean;
            }
        };
    }

    @Bean
    CookieSerializer cookieSerializer(PublicOrigin origin) {
        var cookies = new DefaultCookieSerializer();
        cookies.setCookieName("JSESSIONID");
        cookies.setCookiePath("/");
        cookies.setUseHttpOnlyCookie(true);
        cookies.setSameSite("Lax");
        cookies.setUseSecureCookie(origin.secure());
        cookies.setUseBase64Encoding(false);
        return new CookieSerializer() {
            @Override
            public void writeCookieValue(CookieValue value) {
                if (!value.getCookieValue().isEmpty()
                        && value.getRequest().getAttribute(PersistentSessionSecurityContextRepository.PERSISTENT_LOGIN)
                                != null) {
                    value.setCookieMaxAge(
                            Math.toIntExact(PersistentSessionSecurityContextRepository.ABSOLUTE.toSeconds()));
                }
                cookies.writeCookieValue(value);
            }

            @Override
            public List<String> readCookieValues(HttpServletRequest request) {
                return cookies.readCookieValues(request);
            }
        };
    }
}
