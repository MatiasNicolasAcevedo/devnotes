package com.example.devnotes.serviceactivity;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Delayed;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.Trigger;

/**
 * Controlled {@link TaskScheduler}: one-shot tasks are only recorded and run when a test says so, so no test waits ten
 * real minutes. Periodic APIs fail on purpose: the probe sequence must only use cancelable one-shot tasks.
 */
public final class ManualTaskScheduler implements TaskScheduler {

    private final List<Task> tasks = new ArrayList<>();

    @Override
    public synchronized ScheduledFuture<?> schedule(Runnable task, Instant startTime) {
        var scheduled = new Task(task, startTime);
        tasks.add(scheduled);
        return scheduled;
    }

    /** Tasks neither cancelled nor run, earliest first. */
    public synchronized List<Task> pending() {
        return tasks.stream()
                .filter(task -> !task.isDone())
                .sorted(Comparator.comparing(Task::at))
                .toList();
    }

    public synchronized List<Task> all() {
        return List.copyOf(tasks);
    }

    public Optional<Task> next() {
        return pending().stream().findFirst();
    }

    /** Runs the earliest pending task on the calling thread and returns its planned instant. */
    public Instant runNext() {
        Task task = next().orElseThrow(() -> new AssertionError("no pending task"));
        task.run();
        return task.at();
    }

    public synchronized void clear() {
        tasks.forEach(task -> task.cancel(false));
        tasks.clear();
    }

    @Override
    public ScheduledFuture<?> schedule(Runnable task, Trigger trigger) {
        throw new UnsupportedOperationException("trigger-based scheduling is not allowed for the probe");
    }

    @Override
    public ScheduledFuture<?> scheduleAtFixedRate(Runnable task, Instant startTime, Duration period) {
        throw new UnsupportedOperationException("periodic scheduling is not allowed for the probe");
    }

    @Override
    public ScheduledFuture<?> scheduleAtFixedRate(Runnable task, Duration period) {
        throw new UnsupportedOperationException("periodic scheduling is not allowed for the probe");
    }

    @Override
    public ScheduledFuture<?> scheduleWithFixedDelay(Runnable task, Instant startTime, Duration delay) {
        throw new UnsupportedOperationException("periodic scheduling is not allowed for the probe");
    }

    @Override
    public ScheduledFuture<?> scheduleWithFixedDelay(Runnable task, Duration delay) {
        throw new UnsupportedOperationException("periodic scheduling is not allowed for the probe");
    }

    /** One-shot task; running it after cancellation is a no-op, like a real cancelled future. */
    public static final class Task implements ScheduledFuture<Object> {

        private final Runnable body;
        private final Instant at;
        private volatile boolean cancelled;
        private volatile boolean ran;

        Task(Runnable body, Instant at) {
            this.body = body;
            this.at = at;
        }

        public Instant at() {
            return at;
        }

        public void run() {
            if (cancelled || ran) {
                return;
            }
            ran = true;
            body.run();
        }

        /** Runs the body even if cancelled: simulates a callback that was already executing when cancelled. */
        public void runDespiteCancellation() {
            body.run();
        }

        public boolean ran() {
            return ran;
        }

        @Override
        public long getDelay(TimeUnit unit) {
            return 0;
        }

        @Override
        public int compareTo(Delayed other) {
            return 0;
        }

        @Override
        public boolean cancel(boolean mayInterruptIfRunning) {
            if (ran) {
                return false;
            }
            cancelled = true;
            return true;
        }

        @Override
        public boolean isCancelled() {
            return cancelled;
        }

        @Override
        public boolean isDone() {
            return cancelled || ran;
        }

        @Override
        public Object get() {
            return null;
        }

        @Override
        public Object get(long timeout, TimeUnit unit) {
            return null;
        }
    }
}
