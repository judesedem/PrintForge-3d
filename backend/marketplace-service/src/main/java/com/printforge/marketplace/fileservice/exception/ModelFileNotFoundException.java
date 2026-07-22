package com.printforge.marketplace.fileservice.exception;

/**
 * Thrown when a ModelFile record can't be found for the given id.
 * Named "ModelFile..." rather than just "FileNotFoundException" so it
 * doesn't collide with java.io.FileNotFoundException.
 */
public class ModelFileNotFoundException extends RuntimeException {

    public ModelFileNotFoundException(Long id) {
        super("No file found with id " + id);
    }
}
