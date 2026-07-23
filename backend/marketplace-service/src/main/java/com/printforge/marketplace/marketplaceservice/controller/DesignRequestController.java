package com.printforge.marketplace.marketplaceservice.controller;

import com.printforge.marketplace.entity.User;
import com.printforge.marketplace.marketplaceservice.model.DesignRequest;
import com.printforge.marketplace.marketplaceservice.repository.DesignRequestRepository;
import com.printforge.marketplace.notificationservice.service.NotificationService;
import com.printforge.marketplace.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/design-requests")
public class DesignRequestController {

    private final DesignRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public DesignRequestController(DesignRequestRepository requestRepository, UserRepository userRepository, NotificationService notificationService) {
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<DesignRequest>> getAllRequests(@RequestParam(required = false) String status) {
        List<DesignRequest> requests;
        if (status != null && !status.isBlank()) {
            requests = requestRepository.findByStatus(status.toUpperCase());
        } else {
            requests = requestRepository.findAll();
        }
        
        enrichWithUser(requests);
        enrichWithDesigner(requests);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/my-requests")
    public ResponseEntity<List<DesignRequest>> getMyRequests(Authentication authentication) {
        User caller = currentUser(authentication);
        List<DesignRequest> requests = requestRepository.findByUserId(caller.getUserId());
        enrichWithUser(requests);
        enrichWithDesigner(requests);
        return ResponseEntity.ok(requests);
    }

    @PostMapping(consumes = "application/json")
    public ResponseEntity<DesignRequest> createRequest(
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        
        User caller = currentUser(authentication);

        DesignRequest request = new DesignRequest();
        request.setUserId(caller.getUserId());
        request.setTitle((String) body.get("title"));
        request.setDescription((String) body.get("description"));
        
        if (body.containsKey("budget")) {
            request.setBudget(new BigDecimal(body.get("budget").toString()));
        }
        
        if (body.containsKey("deadline")) {
            request.setDeadline(LocalDateTime.parse((String) body.get("deadline")));
        }

        DesignRequest saved = requestRepository.save(request);
        saved.setUserName(caller.getFullName());
        
        return ResponseEntity.ok(saved);
    }

    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN', 'DESIGNER')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<DesignRequest> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        
        DesignRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Design Request not found: " + id));
                
        if (body.containsKey("status")) {
            request.setStatus(body.get("status").toUpperCase());
        }
        
        DesignRequest saved = requestRepository.save(request);
        
        // Enrich for response
        userRepository.findById(saved.getUserId()).ifPresent(user -> saved.setUserName(user.getFullName()));
        if (saved.getDesignerId() != null) {
            userRepository.findById(saved.getDesignerId()).ifPresent(designer -> saved.setDesignerName(designer.getFullName()));
        }
        
        return ResponseEntity.ok(saved);
    }

    @PreAuthorize("hasRole('DESIGNER')")
    @GetMapping("/my-accepted-requests")
    public ResponseEntity<List<DesignRequest>> getMyAcceptedRequests(Authentication authentication) {
        User caller = currentUser(authentication);
        List<DesignRequest> requests = requestRepository.findByDesignerId(caller.getUserId());
        enrichWithUser(requests);
        enrichWithDesigner(requests);
        return ResponseEntity.ok(requests);
    }

    @PreAuthorize("hasRole('DESIGNER')")
    @PatchMapping("/{id}/accept")
    public ResponseEntity<DesignRequest> acceptRequest(
            @PathVariable Long id,
            Authentication authentication) {
        
        DesignRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Design Request not found: " + id));
        
        if (!"OPEN".equals(request.getStatus())) {
            throw new IllegalStateException("Request is not OPEN");
        }
        
        User caller = currentUser(authentication);
        request.setStatus("ACCEPTED");
        request.setDesignerId(caller.getUserId());
        
        DesignRequest saved = requestRepository.save(request);
        
        notificationService.createNotification(
                request.getUserId(),
                "Request Accepted",
                "Designer " + caller.getFullName() + " has accepted your design request: " + request.getTitle(),
                "INFO"
        );
        
        userRepository.findById(saved.getUserId()).ifPresent(user -> saved.setUserName(user.getFullName()));
        saved.setDesignerName(caller.getFullName());
        
        return ResponseEntity.ok(saved);
    }

    @PreAuthorize("hasRole('DESIGNER')")
    @PatchMapping("/{id}/deliver")
    public ResponseEntity<DesignRequest> deliverRequest(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        
        DesignRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Design Request not found: " + id));
        
        User caller = currentUser(authentication);
        if (!caller.getUserId().equals(request.getDesignerId())) {
            throw new AccessDeniedException("You are not the assigned designer for this request");
        }
        if (!"ACCEPTED".equals(request.getStatus())) {
            throw new IllegalStateException("Request is not ACCEPTED");
        }
        
        if (!body.containsKey("fileId")) {
            throw new IllegalArgumentException("fileId is required");
        }
        
        request.setFileId(Long.valueOf(body.get("fileId").toString()));
        request.setStatus("FULFILLED");
        
        DesignRequest saved = requestRepository.save(request);
        
        notificationService.createNotification(
                request.getUserId(),
                "Design Delivered",
                "Designer " + caller.getFullName() + " has delivered the file for your request: " + request.getTitle(),
                "SUCCESS"
        );
        
        userRepository.findById(saved.getUserId()).ifPresent(user -> saved.setUserName(user.getFullName()));
        saved.setDesignerName(caller.getFullName());
        
        return ResponseEntity.ok(saved);
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UsernameNotFoundException("User not found");
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private void enrichWithUser(List<DesignRequest> requests) {
        if (requests.isEmpty()) return;
        List<Long> userIds = requests.stream()
                .map(DesignRequest::getUserId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));
        for (DesignRequest request : requests) {
            User user = users.get(request.getUserId());
            if (user != null) {
                request.setUserName(user.getFullName());
            }
        }
    }

    private void enrichWithDesigner(List<DesignRequest> requests) {
        if (requests.isEmpty()) return;
        List<Long> designerIds = requests.stream()
                .map(DesignRequest::getDesignerId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> designers = userRepository.findAllById(designerIds).stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));
        for (DesignRequest request : requests) {
            if (request.getDesignerId() != null) {
                User designer = designers.get(request.getDesignerId());
                if (designer != null) {
                    request.setDesignerName(designer.getFullName());
                }
            }
        }
    }
}
