package com.iadaf.user.exception;

public class UserAlreadyExistsException extends RuntimeException {
    
    public UserAlreadyExistsException(String email) {
        super(String.format("Un utilisateur avec l'email '%s' existe déjà", email));
    }
}
