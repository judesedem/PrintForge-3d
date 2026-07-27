package com.printforge.admin.config;

import org.springframework.amqp.core.FanoutExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    public static final String USER_DELETED_EXCHANGE = "user.deleted.exchange";

    @Bean
    public FanoutExchange userDeletedExchange() {
        return new FanoutExchange(USER_DELETED_EXCHANGE);
    }
}
