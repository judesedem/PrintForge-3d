#!/bin/bash
set -e

BACKEND="/Users/garethmartey/Documents/GitHub/PrintForge-3d/backend"
# Source from notification-service since the team member already moved the monolith there
# Wait, actually let's source from printforge (if it exists) OR from notification-service.
# The user's team member placed adminservice in notification-service, so we'll grab it from there.
# Let's see if we can just copy it directly.

SVC="admin-service"
PKG="admin"
BASE="$BACKEND/$SVC/src/main/java/com/printforge/$PKG"
mkdir -p "$BASE" "$BACKEND/$SVC/src/main/resources" "$BACKEND/$SVC/src/test/java/com/printforge/$PKG"

# We'll use notification-service as the source since it has all the monolith entities (and adminservice).
MONO="$BACKEND/notification-service/src/main/java/com/printforge/notification"

echo "Copying adminservice..."
cp -r "$MONO/adminservice" "$BASE/"

echo "Copying entity, repository, dto, exception, security..."
mkdir -p "$BASE/entity" "$BASE/repository" "$BASE/dto" "$BASE/exception" "$BASE/security"
cp "$MONO/entity/User.java" "$MONO/entity/Role.java" "$BASE/entity/"
cp "$MONO/repository/UserRepository.java" "$BASE/repository/"
cp "$MONO/dto/ErrorResponse.java" "$MONO/dto/UserDto.java" "$BASE/dto/"
cp "$MONO/security/HeaderAuthFilter.java" "$BASE/security/"

echo "Copying queueservice (PrintJob)..."
mkdir -p "$BASE/queueservice/model" "$BASE/queueservice/repository"
cp "$MONO/queueservice/model/PrintJob.java" "$BASE/queueservice/model/"
cp "$MONO/queueservice/repository/PrintJobRepository.java" "$BASE/queueservice/repository/"

echo "Copying printerservice..."
mkdir -p "$BASE/printerservice/model" "$BASE/printerservice/repository"
cp "$MONO/printerservice/model/Printer.java" "$BASE/printerservice/model/"
cp "$MONO/printerservice/repository/PrinterRepository.java" "$BASE/printerservice/repository/"

echo "Copying marketplaceservice..."
mkdir -p "$BASE/marketplaceservice/model" "$BASE/marketplaceservice/repository" "$BASE/marketplaceservice/exception"
cp "$MONO/marketplaceservice/model/DesignListing.java" "$MONO/marketplaceservice/model/Favorite.java" "$BASE/marketplaceservice/model/"
cp "$MONO/marketplaceservice/repository/DesignListingRepository.java" "$BASE/marketplaceservice/repository/"
cp "$MONO/marketplaceservice/exception/ListingNotFoundException.java" "$BASE/marketplaceservice/exception/"
cp "$MONO/marketplaceservice/exception/InvalidListingInputException.java" "$BASE/marketplaceservice/exception/"

echo "Copying notificationservice..."
mkdir -p "$BASE/notificationservice/model" "$BASE/notificationservice/repository" "$BASE/notificationservice/service"
cp "$MONO/notificationservice/model/Notification.java" "$BASE/notificationservice/model/"
cp "$MONO/notificationservice/repository/NotificationRepository.java" "$BASE/notificationservice/repository/"
cp "$MONO/notificationservice/service/NotificationService.java" "$BASE/notificationservice/service/"

echo "Copying moderationservice..."
mkdir -p "$BASE/moderationservice/model" "$BASE/moderationservice/repository" "$BASE/moderationservice/service"
cp "$MONO/moderationservice/model/"* "$BASE/moderationservice/model/"
cp "$MONO/moderationservice/repository/"* "$BASE/moderationservice/repository/"
cp "$MONO/moderationservice/service/"* "$BASE/moderationservice/service/"

echo "Renaming packages..."
find "$BACKEND/$SVC/src" -name "*.java" -exec sed -i '' "s/com\.printforge\.notification/com.printforge.$PKG/g" {} +

echo "Done."
