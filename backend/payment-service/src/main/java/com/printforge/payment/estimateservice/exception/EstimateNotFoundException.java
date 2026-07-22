package com.printforge.payment.estimateservice.exception;

/**
 * Thrown when an Estimate record can't be found for the given id.
 * Estimate Service itself doesn't have any endpoints that look up a single
 * estimate yet (that's a separate gap — no GET endpoint exists at all), but
 * Queue Service needs this now to validate that a print job isn't created
 * referencing an estimate that doesn't exist.
 */
public class EstimateNotFoundException extends RuntimeException {

    public EstimateNotFoundException(Long id) {
        super("No estimate found with id " + id);
    }
}
