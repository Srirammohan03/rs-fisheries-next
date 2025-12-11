import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { User } from "./user-types";

export const useUsers = () => {
  return useQuery<User[]>({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data } = await axios.get("/api/team-member");
      return data.data || [];
    },
  });
};
