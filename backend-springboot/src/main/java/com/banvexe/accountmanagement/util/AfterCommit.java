package com.banvexe.accountmanagement.util;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

public final class AfterCommit {

    private AfterCommit() {
    }

    public static void run(Runnable task) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            task.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                task.run();
            }
        });
    }
}
