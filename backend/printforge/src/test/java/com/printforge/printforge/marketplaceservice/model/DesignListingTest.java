package com.printforge.printforge.marketplaceservice.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure POJO test, no Spring context or DB — getDisplayStatus() is a plain
 * derived getter with no backing field, so there's nothing to mock.
 *
 * Run with: ./mvnw test -Dtest=DesignListingTest
 */
class DesignListingTest {

    @Test
    void displayStatusIsRemovedWhenAdminUnpublished() {
        DesignListing listing = new DesignListing();
        listing.setStatus("DRAFT");
        listing.setAdminUnpublished(true);

        assertEquals("REMOVED", listing.getDisplayStatus());
    }

    @Test
    void displayStatusIsRemovedEvenIfUnderlyingStatusIsStillPublished() {
        // adminUnpublished always flips status back to DRAFT in practice
        // (AdminService.unpublishListing()), but displayStatus should not
        // depend on that invariant holding — it's REMOVED purely because
        // an admin took it down, regardless of what status happens to say.
        DesignListing listing = new DesignListing();
        listing.setStatus("PUBLISHED");
        listing.setAdminUnpublished(true);

        assertEquals("REMOVED", listing.getDisplayStatus());
    }

    @Test
    void displayStatusMatchesRealStatusWhenNotAdminUnpublished() {
        DesignListing draft = new DesignListing();
        draft.setStatus("DRAFT");
        assertEquals("DRAFT", draft.getDisplayStatus());

        DesignListing published = new DesignListing();
        published.setStatus("PUBLISHED");
        assertEquals("PUBLISHED", published.getDisplayStatus());
    }

    @Test
    void displayStatusMatchesRealStatusWhenAdminUnpublishedIsExplicitlyFalse() {
        DesignListing listing = new DesignListing();
        listing.setStatus("PUBLISHED");
        listing.setAdminUnpublished(false);

        assertEquals("PUBLISHED", listing.getDisplayStatus());
    }

    @Test
    void displayStatusMatchesRealStatusWhenAdminUnpublishedIsNull() {
        // Older listings created before adminUnpublished existed have it
        // null, not false — same "never taken down" meaning either way.
        DesignListing listing = new DesignListing();
        listing.setStatus("DRAFT");
        listing.setAdminUnpublished(null);

        assertEquals("DRAFT", listing.getDisplayStatus());
    }

    @Test
    void getStatusItselfIsNeverAffectedByDisplayStatus() {
        // The whole point of this field: status stays exactly what it
        // always was, for every existing status-checking code path.
        DesignListing listing = new DesignListing();
        listing.setStatus("DRAFT");
        listing.setAdminUnpublished(true);

        assertEquals("DRAFT", listing.getStatus());
        assertEquals("REMOVED", listing.getDisplayStatus());
    }
}
