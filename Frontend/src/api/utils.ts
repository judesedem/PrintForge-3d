/**
 * Maps the uppercase quality enum used by POST /api/estimates
 * ("DRAFT"/"STANDARD"/"HIGH", also how it's stored on the Estimate entity)
 * to the Title-Case words POST /api/print-jobs/upload's mapQuality()
 * expects on the Java side ("Draft"/"Standard"/"Fine" — HIGH maps to
 * "Fine", not "High").
 *
 * NOT CURRENTLY USED anywhere in this app. This app's submit flow is
 * payment-gated end to end (upload → estimate → pay → webhook creates the
 * job) and never calls POST /api/print-jobs/upload directly — confirmed by
 * reading PaymentService.handleWebhook(), which builds the PrintJob from
 * the linked Estimate's own stored fields (`job.setQuality(linkedEstimate.getQuality())`),
 * i.e. the uppercase value, with no call to mapQuality() anywhere in that
 * path. This helper exists per an explicit audit finding (the two
 * endpoints' quality formats don't match) so the mismatch is documented in
 * one place rather than rediscovered later — kept ready for if/when
 * something calls the upload endpoint directly.
 */
export function mapQualityForUpload(quality: 'DRAFT' | 'STANDARD' | 'HIGH' | string): string {
  switch (quality) {
    case 'HIGH':
      return 'Fine';
    case 'DRAFT':
      return 'Draft';
    case 'STANDARD':
    default:
      return 'Standard';
  }
}
