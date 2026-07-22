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

# The module to build and run, passed as an argument (e.g., api-gateway, auth-service)
ARG MODULE_NAME

# Build the specific module and its dependencies
RUN mvn clean package -pl ${MODULE_NAME} -am -DskipTests

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
