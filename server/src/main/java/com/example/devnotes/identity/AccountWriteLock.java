package com.example.devnotes.identity;

import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AccountWriteLock {
    private final JdbcTemplate jdbc;

    public AccountWriteLock(DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
    }

    /** Locks the owner row for the caller's transaction. Returns false if the account is absent. */
    @Transactional(propagation = Propagation.MANDATORY)
    public boolean acquire(UUID ownerId) {
        return !jdbc.queryForList("SELECT id FROM app_user WHERE id = ? FOR UPDATE", UUID.class, ownerId)
                .isEmpty();
    }
}
