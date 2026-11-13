package com.example.devnotes.serviceactivity.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface ServiceAwakeWindowRepository extends JpaRepository<ServiceAwakeWindow, Integer> {

    /** Row lock on the migrated singleton: concurrent starts from several tabs serialize on it. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM ServiceAwakeWindow w WHERE w.id = " + ServiceAwakeWindow.SINGLETON_ID)
    Optional<ServiceAwakeWindow> lockSingleton();

    @Query("SELECT w FROM ServiceAwakeWindow w WHERE w.id = " + ServiceAwakeWindow.SINGLETON_ID)
    Optional<ServiceAwakeWindow> findSingleton();
}
