package com.printforge.admin.materialservice.exception;

public class MaterialNotFoundException extends RuntimeException {
    public MaterialNotFoundException(String name) {
        super("Unknown material: " + name);
    }
}
