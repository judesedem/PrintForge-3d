#!/bin/bash
set -e

BACKEND="/Users/garethmartey/Documents/GitHub/PrintForge-3d/backend"
MONO="$BACKEND/monolith/src/main/java/com/printforge/printforge"

echo "=== Creating order-service ==="
SVC="order-service"; PKG="order"
BASE="$BACKEND/$SVC/src/main/java/com/printforge/$PKG"
mkdir -p "$BASE" "$BACKEND/$SVC/src/main/resources" "$BACKEND/$SVC/src/test/java/com/printforge/$PKG"

for dir in queueservice estimateservice labservice materialservice facade; do cp -r "$MONO/$dir" "$BASE/"; done
mkdir -p "$BASE/entity" "$BASE/repository" "$BASE/dto" "$BASE/security" "$BASE/exception" "$BASE/config" "$BASE/service" "$BASE/controller"
cp "$MONO/entity/User.java" "$MONO/entity/Role.java" "$BASE/entity/"
cp "$MONO/repository/UserRepository.java" "$MONO/repository/JobServicePrintJobRepository.java" "$BASE/repository/"
cp "$MONO/dto/ErrorResponse.java" "$MONO/dto/UpdateJobRequest.java" "$MONO/dto/UserDto.java" "$MONO/dto/UserStatsResponse.java" "$BASE/dto/"
cp "$MONO/security/HeaderAuthFilter.java" "$BASE/security/"
cp "$MONO/controller/PrintJobController.java" "$BASE/controller/"
cp "$MONO/service/PrintJobService.java" "$BASE/service/"
cp "$MONO/config/LabLocationSeeder.java" "$BASE/config/"
mkdir -p "$BASE/fileservice/model" "$BASE/fileservice/repository" "$BASE/fileservice/service" "$BASE/fileservice/exception"
cp "$MONO/fileservice/model/ModelFile.java" "$BASE/fileservice/model/"
cp "$MONO/fileservice/repository/ModelFileRepository.java" "$BASE/fileservice/repository/"
cp "$MONO/fileservice/service/FileService.java" "$BASE/fileservice/service/"
cp "$MONO/fileservice/exception/"*.java "$BASE/fileservice/exception/"
mkdir -p "$BASE/marketplaceservice/model" "$BASE/marketplaceservice/repository" "$BASE/marketplaceservice/exception"
cp "$MONO/marketplaceservice/model/DesignListing.java" "$MONO/marketplaceservice/model/Favorite.java" "$BASE/marketplaceservice/model/"
cp "$MONO/marketplaceservice/repository/DesignListingRepository.java" "$BASE/marketplaceservice/repository/"
cp "$MONO/marketplaceservice/exception/ListingNotFoundException.java" "$MONO/marketplaceservice/exception/ListingNotPublishedException.java" "$BASE/marketplaceservice/exception/"
mkdir -p "$BASE/notificationservice/service" "$BASE/notificationservice/model" "$BASE/notificationservice/repository"
cp "$MONO/notificationservice/model/Notification.java" "$BASE/notificationservice/model/"
cp "$MONO/notificationservice/repository/NotificationRepository.java" "$BASE/notificationservice/repository/"
cp "$MONO/notificationservice/service/NotificationService.java" "$BASE/notificationservice/service/"
# FileService needs storage + geometry + cloudinary
mkdir -p "$BASE/fileservice/storage" "$BASE/fileservice/geometry" "$BASE/fileservice/dto"
cp "$MONO/fileservice/storage/"*.java "$BASE/fileservice/storage/"
cp "$MONO/fileservice/geometry/"*.java "$BASE/fileservice/geometry/"
cp "$MONO/fileservice/dto/"*.java "$BASE/fileservice/dto/" 2>/dev/null || true
cp "$MONO/config/CloudinaryConfig.java" "$BASE/config/"

echo "=== Creating marketplace-service ==="
SVC="marketplace-service"; PKG="marketplace"
BASE="$BACKEND/$SVC/src/main/java/com/printforge/$PKG"
mkdir -p "$BASE" "$BACKEND/$SVC/src/main/resources" "$BACKEND/$SVC/src/test/java/com/printforge/$PKG"

for dir in marketplaceservice socialservice fileservice; do cp -r "$MONO/$dir" "$BASE/"; done
mkdir -p "$BASE/entity" "$BASE/repository" "$BASE/dto" "$BASE/security" "$BASE/exception" "$BASE/config" "$BASE/controller" "$BASE/service"
cp "$MONO/entity/User.java" "$MONO/entity/Role.java" "$BASE/entity/"
cp "$MONO/repository/UserRepository.java" "$BASE/repository/"
cp "$MONO/dto/ErrorResponse.java" "$MONO/dto/UserDto.java" "$MONO/dto/UserStatsResponse.java" "$BASE/dto/"
cp "$MONO/security/HeaderAuthFilter.java" "$BASE/security/"
cp "$MONO/controller/UserController.java" "$BASE/controller/"
cp "$MONO/service/UserService.java" "$BASE/service/"
cp "$MONO/config/CloudinaryConfig.java" "$BASE/config/"
cp "$MONO/exception/InvalidProfileInputException.java" "$BASE/exception/"
mkdir -p "$BASE/queueservice/repository" "$BASE/queueservice/model"
cp "$MONO/queueservice/repository/PrintJobRepository.java" "$BASE/queueservice/repository/"
cp "$MONO/queueservice/model/PrintJob.java" "$BASE/queueservice/model/"
mkdir -p "$BASE/estimateservice/repository" "$BASE/estimateservice/model"
cp "$MONO/estimateservice/repository/EstimateRepository.java" "$BASE/estimateservice/repository/"
cp "$MONO/estimateservice/model/Estimate.java" "$BASE/estimateservice/model/"

echo "=== Creating payment-service ==="
SVC="payment-service"; PKG="payment"
BASE="$BACKEND/$SVC/src/main/java/com/printforge/$PKG"
mkdir -p "$BASE" "$BACKEND/$SVC/src/main/resources" "$BACKEND/$SVC/src/test/java/com/printforge/$PKG"

cp -r "$MONO/paymentservice" "$BASE/"
mkdir -p "$BASE/entity" "$BASE/repository" "$BASE/dto" "$BASE/security" "$BASE/exception"
cp "$MONO/entity/User.java" "$MONO/entity/Role.java" "$BASE/entity/"
cp "$MONO/repository/UserRepository.java" "$BASE/repository/"
cp "$MONO/dto/ErrorResponse.java" "$BASE/dto/"
cp "$MONO/security/HeaderAuthFilter.java" "$BASE/security/"
mkdir -p "$BASE/queueservice/model" "$BASE/queueservice/repository" "$BASE/queueservice/service" "$BASE/queueservice/exception"
cp "$MONO/queueservice/model/PrintJob.java" "$BASE/queueservice/model/"
cp "$MONO/queueservice/repository/PrintJobRepository.java" "$BASE/queueservice/repository/"
cp "$MONO/queueservice/service/PrintQueueService.java" "$BASE/queueservice/service/"
cp "$MONO/queueservice/exception/"*.java "$BASE/queueservice/exception/"
mkdir -p "$BASE/estimateservice/model" "$BASE/estimateservice/repository"
cp "$MONO/estimateservice/model/Estimate.java" "$BASE/estimateservice/model/"
cp "$MONO/estimateservice/repository/EstimateRepository.java" "$BASE/estimateservice/repository/"
mkdir -p "$BASE/notificationservice/service" "$BASE/notificationservice/model" "$BASE/notificationservice/repository"
cp "$MONO/notificationservice/model/Notification.java" "$BASE/notificationservice/model/"
cp "$MONO/notificationservice/repository/NotificationRepository.java" "$BASE/notificationservice/repository/"
cp "$MONO/notificationservice/service/NotificationService.java" "$BASE/notificationservice/service/"
mkdir -p "$BASE/marketplaceservice/model" "$BASE/marketplaceservice/repository"
cp "$MONO/marketplaceservice/model/DesignListing.java" "$MONO/marketplaceservice/model/Favorite.java" "$BASE/marketplaceservice/model/"
cp "$MONO/marketplaceservice/repository/DesignListingRepository.java" "$BASE/marketplaceservice/repository/"
mkdir -p "$BASE/fileservice/model" "$BASE/fileservice/repository"
cp "$MONO/fileservice/model/ModelFile.java" "$BASE/fileservice/model/"
cp "$MONO/fileservice/repository/ModelFileRepository.java" "$BASE/fileservice/repository/"
mkdir -p "$BASE/printerservice/model" "$BASE/printerservice/repository" "$BASE/printerservice/exception"
cp "$MONO/printerservice/model/Printer.java" "$BASE/printerservice/model/"
cp "$MONO/printerservice/repository/PrinterRepository.java" "$BASE/printerservice/repository/"
cp "$MONO/printerservice/exception/"*.java "$BASE/printerservice/exception/"
mkdir -p "$BASE/labservice/model" "$BASE/labservice/repository" "$BASE/labservice/service" "$BASE/labservice/dto" "$BASE/labservice/exception"
cp "$MONO/labservice/model/LabLocation.java" "$BASE/labservice/model/"
cp "$MONO/labservice/repository/LabLocationRepository.java" "$BASE/labservice/repository/"
cp "$MONO/labservice/service/LabLocationService.java" "$BASE/labservice/service/"
cp "$MONO/labservice/dto/"*.java "$BASE/labservice/dto/"
cp "$MONO/labservice/exception/"*.java "$BASE/labservice/exception/"
mkdir -p "$BASE/notificationservice/exception"
cp "$MONO/notificationservice/exception/"*.java "$BASE/notificationservice/exception/"

echo "=== Creating notification-service ==="
SVC="notification-service"; PKG="notification"
BASE="$BACKEND/$SVC/src/main/java/com/printforge/$PKG"
mkdir -p "$BASE" "$BACKEND/$SVC/src/main/resources" "$BACKEND/$SVC/src/test/java/com/printforge/$PKG"

for dir in notificationservice moderationservice adminservice emailservice; do cp -r "$MONO/$dir" "$BASE/"; done
mkdir -p "$BASE/entity" "$BASE/repository" "$BASE/dto" "$BASE/security" "$BASE/exception"
cp "$MONO/entity/User.java" "$MONO/entity/Role.java" "$BASE/entity/"
cp "$MONO/repository/UserRepository.java" "$BASE/repository/"
cp "$MONO/dto/ErrorResponse.java" "$MONO/dto/UserDto.java" "$BASE/dto/"
cp "$MONO/security/HeaderAuthFilter.java" "$BASE/security/"
mkdir -p "$BASE/marketplaceservice/model" "$BASE/marketplaceservice/repository" "$BASE/marketplaceservice/exception"
cp "$MONO/marketplaceservice/model/DesignListing.java" "$MONO/marketplaceservice/model/Favorite.java" "$BASE/marketplaceservice/model/"
cp "$MONO/marketplaceservice/repository/DesignListingRepository.java" "$BASE/marketplaceservice/repository/"
mkdir -p "$BASE/queueservice/repository" "$BASE/queueservice/model"
cp "$MONO/queueservice/repository/PrintJobRepository.java" "$BASE/queueservice/repository/"
cp "$MONO/queueservice/model/PrintJob.java" "$BASE/queueservice/model/"
mkdir -p "$BASE/fileservice/model" "$BASE/fileservice/repository"
cp "$MONO/fileservice/model/ModelFile.java" "$BASE/fileservice/model/"
cp "$MONO/fileservice/repository/ModelFileRepository.java" "$BASE/fileservice/repository/"
mkdir -p "$BASE/printerservice/repository" "$BASE/printerservice/model"
cp "$MONO/printerservice/repository/PrinterRepository.java" "$BASE/printerservice/repository/"
cp "$MONO/printerservice/model/Printer.java" "$BASE/printerservice/model/"
cp "$MONO/exception/InvalidProfileInputException.java" "$BASE/exception/"
cp "$MONO/config/AdminSeeder.java" "$BASE/config/" 2>/dev/null && mkdir -p "$BASE/config" && cp "$MONO/config/AdminSeeder.java" "$BASE/config/" || true

echo "=== Renaming packages ==="
for svc_dir in order-service marketplace-service payment-service notification-service; do
    case "$svc_dir" in
        order-service) pkg="order" ;;
        marketplace-service) pkg="marketplace" ;;
        payment-service) pkg="payment" ;;
        notification-service) pkg="notification" ;;
    esac
    find "$BACKEND/$svc_dir/src" -name "*.java" -exec sed -i '' "s/com\.printforge\.printforge/com.printforge.$pkg/g" {} +
    echo "  Renamed packages in $svc_dir"
done

echo "=== All services created ==="
