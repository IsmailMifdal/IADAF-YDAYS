package com.iadaf.analytics.exception;

public class ServiceUnavailableException extends RuntimeException {
    public ServiceUnavailableException(String serviceName) {
        super("Service " + serviceName + " is currently unavailable");
    }

    public ServiceUnavailableException(String serviceName, Throwable cause) {
        super("Service " + serviceName + " is currently unavailable: " + cause.getMessage(), cause);
    }
}
