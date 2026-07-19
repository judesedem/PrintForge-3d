package com.printforge.printforge.service;

import com.printforge.printforge.dto.UserDto;
import com.printforge.printforge.dto.UserStatsResponse;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.fileservice.storage.FileStorageService;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.repository.UserRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Backs the new /api/users/* endpoints (profile picture upload, public
 * designer listing, designer stats). Kept separate from AuthService, which
 * owns registration/login/the current-user's own /me — this is about
 * looking up and enriching *other* users' public-facing data.
 */
@Service
public class UserService {

    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final DesignListingRepository listingRepository;

    public UserService(UserRepository userRepository,
                        FileStorageService fileStorageService,
                        DesignListingRepository listingRepository) {
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
        this.listingRepository = listingRepository;
    }

    public UserDto updateProfilePicture(Long userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (user.getProfilePicturePublicId() != null) {
            fileStorageService.deleteImage(user.getProfilePicturePublicId());
        }

        FileStorageService.CloudinaryImageResult result = fileStorageService.storeImage(file);
        user.setProfilePictureUrl(result.url());
        user.setProfilePicturePublicId(result.publicId());
        User saved = userRepository.save(user);

        return toUserDto(saved);
    }

    /** GET /api/users/{id}/designs — public, PUBLISHED-only, newest first. */
    public List<DesignListing> getPublishedDesignsForUser(Long designerId) {
        List<DesignListing> listings =
                listingRepository.findByDesignerIdAndStatusOrderByCreatedAtDesc(designerId, "PUBLISHED");
        enrichWithDesigner(listings);
        return listings;
    }

    /**
     * GET /api/users/{id}/stats. Earnings are only meaningful for the
     * designer themselves and staff/admin — anyone else gets null rather
     * than the designer's exact revenue figure.
     */
    public UserStatsResponse getUserStats(Long userId, Long callerId, boolean callerIsAdmin) {
        List<DesignListing> listings = listingRepository.findByDesignerId(userId);

        long designCount = listings.stream()
                .filter(l -> "PUBLISHED".equals(l.getStatus()))
                .count();

        boolean canSeeEarnings = callerIsAdmin || userId.equals(callerId);
        BigDecimal totalEarnings = null;
        if (canSeeEarnings) {
            totalEarnings = listings.stream()
                    .map(DesignListing::getTotalEarnings)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        return UserStatsResponse.builder()
                .userId(userId)
                .designCount((int) designCount)
                .followerCount(0)
                .followingCount(0)
                .totalLikes(0)
                .totalEarnings(totalEarnings)
                .build();
    }

    private void enrichWithDesigner(List<DesignListing> listings) {
        if (listings.isEmpty()) return;
        List<Long> designerIds = listings.stream()
                .map(DesignListing::getDesignerId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> designers = userRepository.findAllById(designerIds).stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));
        for (DesignListing listing : listings) {
            User designer = designers.get(listing.getDesignerId());
            if (designer != null) {
                listing.setDesignerName(designer.getFullName());
                listing.setDesignerAvatar(designer.getProfilePictureUrl());
            }
        }
    }

    private UserDto toUserDto(User user) {
        return UserDto.builder()
                .user_id(user.getUserId())
                .full_name(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name().toLowerCase())
                .profile_picture_url(user.getProfilePictureUrl())
                .build();
    }
}
