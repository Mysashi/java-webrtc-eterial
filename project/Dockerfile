FROM gradle:jdk17-alpine as build
WORKDIR /app

COPY build.gradle settings.gradle ./
COPY gradle ./gradle
COPY src ./src
COPY src/main/resources/keystore.jks ./src/main/resources/keystore.jks

RUN gradle clean build --no-daemon

FROM openjdk:17
WORKDIR /app
COPY --from=build /app/build/libs/eterial-0.0.1-SNAPSHOT.jar app/app.jar
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app/app.jar"]
