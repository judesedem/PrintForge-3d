package com.printforge.marketplace.listener;

import com.printforge.marketplace.config.RabbitMQConfig;
import com.printforge.marketplace.marketplaceservice.model.DesignListing;
import com.printforge.marketplace.marketplaceservice.repository.DesignListingRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(name = "spring.rabbitmq.host", matchIfMissing = false)
public class UserEventListener {

    private final DesignListingRepository designListingRepository;

    public UserEventListener(DesignListingRepository designListingRepository) {
        this.designListingRepository = designListingRepository;
    }

    @RabbitListener(queues = RabbitMQConfig.MARKETPLACE_USER_DELETED_QUEUE)
    public void handleUserDeleted(Long userId) {
        List<DesignListing> listings = designListingRepository.findByDesignerId(userId);
        if (!listings.isEmpty()) {
            designListingRepository.deleteAll(listings);
        }
    }
}
