package com.printforge.notification.notificationservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class ExpoPushService {

    private static final Logger logger = LoggerFactory.getLogger(ExpoPushService.class);
    private static final String EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";
    private final RestTemplate restTemplate;

    public ExpoPushService() {
        this.restTemplate = new RestTemplate();
    }

    public void sendPushNotification(String pushToken, String title, String body, String deepLink) {
        if (pushToken == null || pushToken.isBlank()) {
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> payload = new HashMap<>();
            payload.put("to", pushToken);
            payload.put("title", title);
            payload.put("body", body);
            
            if (deepLink != null && !deepLink.isBlank()) {
                payload.put("data", Map.of("url", deepLink));
            }

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            
            restTemplate.postForEntity(EXPO_PUSH_API_URL, request, String.class);
        } catch (Exception e) {
            logger.error("Failed to send Expo push notification", e);
        }
    }
}
