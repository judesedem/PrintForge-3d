# syntax=docker/dockerfile:1
FROM maven:3.9.6-eclipse-temurin-21-jammy AS builder

WORKDIR /app

# Copy parent pom and source code
COPY pom.xml .
COPY api-gateway/ api-gateway/
COPY auth-service/ auth-service/
COPY printer-service/ printer-service/
COPY order-service/ order-service/
COPY marketplace-service/ marketplace-service/
COPY payment-service/ payment-service/
COPY notification-service/ notification-service/
COPY admin-service/ admin-service/

# The module to build and run, passed as an argument (e.g., api-gateway, auth-service)
ARG MODULE_NAME

# Build the specific module and its dependencies. Cache mount persists the
# local Maven repo across builds/retries — without it every retry re-fetches
# the whole dependency tree from scratch, which is what turned transient
# Maven Central hiccups into repeated full-build failures on api-gateway
# (its spring-cloud-gateway tree is far larger than the other services').
#
# The shell retry loop (rather than Maven wagon/resolver flags) is
# deliberate: Maven 3.9's default resolver transport doesn't honor the
# legacy maven.wagon.http.* properties, and guessing the right
# aether.connector.http.* property name isn't worth it when retrying the
# whole `mvn` invocation is transport-agnostic and, thanks to the cache
# mount above, only re-fetches whatever artifact actually failed.
RUN --mount=type=cache,target=/root/.m2 \
    for i in 1 2 3 4 5; do \
      mvn clean package -pl ${MODULE_NAME} -am -DskipTests && exit 0; \
      echo "Build attempt $i failed - retrying in 15s..."; \
      sleep 15; \
    done; \
    exit 1

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

ARG MODULE_NAME
ENV MODULE_NAME=${MODULE_NAME}

# Copy the built jar from the builder stage
COPY --from=builder /app/${MODULE_NAME}/target/*.jar app.jar

# Expose dynamic port for Railway
EXPOSE ${PORT:-8080}

CMD ["java", "-Xmx400m", "-Xss512k", "-XX:+UseContainerSupport", "-Dserver.port=${PORT}", "-jar", "app.jar"]
