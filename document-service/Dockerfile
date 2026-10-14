FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /build

# Copy parent POM and install it locally
COPY pom.xml .
RUN mvn install -N -q

# Copy service POM and source
COPY document-service/pom.xml document-service/
COPY document-service/src document-service/src

# Build the service JAR
RUN mvn -f document-service/pom.xml package -DskipTests -q

# --- Runtime ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /build/document-service/target/*.jar app.jar
RUN apk add --no-cache curl
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]
