package com.iadaf.ai.exception;

public class ResourceNotFoundException extends RuntimeException {
    
    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s non trouvé(e) avec %s : '%s'", resourceName, fieldName, fieldValue));
    }
    
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
