package com.printforge.marketplace.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "spring.rabbitmq.host", matchIfMissing = false)
public class RabbitMQConfig {
    public static final String USER_DELETED_EXCHANGE = "user.deleted.exchange";
    public static final String MARKETPLACE_USER_DELETED_QUEUE = "marketplace.user.deleted.queue";

    @Bean
    public FanoutExchange userDeletedExchange() {
        return new FanoutExchange(USER_DELETED_EXCHANGE);
    }

    @Bean
    public Queue marketplaceUserDeletedQueue() {
        return new Queue(MARKETPLACE_USER_DELETED_QUEUE);
    }

    @Bean
    public Binding bindingUserDeleted(FanoutExchange userDeletedExchange, Queue marketplaceUserDeletedQueue) {
        return BindingBuilder.bind(marketplaceUserDeletedQueue).to(userDeletedExchange);
    }
}
