package com.printforge.printforge.service;

import com.printforge.dto.AuthResponse;
import com.printforge.dto.RegisterRequest;
import com.printforge.entity.Role;
import com.printforge.entity.User;
import com.printforge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@