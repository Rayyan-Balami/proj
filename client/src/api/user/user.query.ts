import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import userApi from "./user.api";
import {
  LoginUserInput,
  RegisterUserInput,
  RefreshTokenInput,
  UpdateUserInput,
  UpdateUserPasswordInput,
} from "@/validation/authForm";
import { useAuthStore } from "@/stores/authStore";
import { User } from "@/types/user";
import { useEffect } from "react";

// ==========================
// GUEST USER HOOKS
// ==========================

export const useRegister = () =>
  useMutation({
    mutationFn: (data: RegisterUserInput) =>
      userApi.register(data).then((res) => res.data),
  });

export const useLogin = () =>
  useMutation({
    mutationFn: (data: LoginUserInput) =>
      userApi.login(data).then((res) => res.data),
  });

export const useRefreshToken = () =>
  useMutation({
    mutationFn: (data: RefreshTokenInput) =>
      userApi.refreshToken(data).then((res) => res.data),
  });

// ==========================
// AUTH USER HOOKS
// ==========================

interface CurrentUserResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    user: User;
  };
  timestamp: string;
}

export const useGetCurrentUser = () => {
  const updateUser = useAuthStore((state) => state.updateUser);
  
  const query = useQuery<CurrentUserResponse>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await userApi.getCurrentUser();
      return response.data;
    },
  });

  useEffect(() => {
    if (query.data?.data?.user) {
      updateUser(query.data.data.user);
    }
  }, [query.data, updateUser]);

  return query;
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserInput) => userApi.updateProfile(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["currentUser"] }),
  });
};

export const useUpdatePassword = () =>
  useMutation({
    mutationFn: (data: UpdateUserPasswordInput) => userApi.updatePassword(data),
  });

export const useLogout = () =>
  useMutation({
    mutationFn: () => userApi.logout(),
  });

// ==========================
// ADMIN USER HOOKS
// ==========================

export const useGetAllUsers = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) =>
  useQuery({
    queryKey: ["adminUsers", params],
    queryFn: () => userApi.getAllUsers(params).then((res) => res.data),
  });

export const useGetUserById = (id: string) =>
  useQuery({
    queryKey: ["adminUser", id],
    queryFn: () => userApi.getUserById(id).then((res) => res.data),
    enabled: !!id,
  });

export const useUpdateUser = () =>
  useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      userApi.updateUser(id, data),
  });

export const useUpdateUserPassword = () =>
  useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPasswordInput }) =>
      userApi.updateUserPassword(id, data),
  });

export const useDeleteUser = () =>
  useMutation({
    mutationFn: (id: string) => userApi.deleteUser(id),
  });
