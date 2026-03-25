package com.iadaf.ai.exception;

public class RateLimitException extends RuntimeException {
    
    public RateLimitException(String message) {
        super(message);
    }
}
