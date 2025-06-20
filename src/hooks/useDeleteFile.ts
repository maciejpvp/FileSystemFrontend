import { addToast } from "@heroui/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import axiosInstance from "../lib/axios";

let globalUuids: string[] = []; //Global UUID so onSuccess has access to provided uuid;

const deleteFile = async (uuids: string[]) => {
  const response = await axiosInstance.delete("/delete-file", {
    data: {
      uuids,
    },
  });

  return response.data;
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  const pathAfterDrive =
    location.pathname.replace("/drive", "").replace(/^\/+/, "") || "";

  const queryKey = [`files/${pathAfterDrive}`];

  return useMutation({
    mutationFn: deleteFile,

    onMutate: (uuids: string[]) => {
      globalUuids = uuids;

      queryClient.setQueryData<any[]>(queryKey, (old = []) =>
        old.map((item) =>
          uuids.includes(item.uuid) ? { ...item, isOptimistic: true } : item,
        ),
      );
    },

    onSuccess: () => {
      addToast({
        title: "Deleted Successfully",
        description: "File Deleted Successfully.",
        color: "success",
      });

      let cleanedStorage = 0;

      queryClient.setQueryData<any[]>(queryKey, (old = []) => {
        const newArray = old.filter((item) => {
          const shouldDelete = globalUuids.includes(item.uuid);

          if (shouldDelete) {
            cleanedStorage += item.size;
          }

          return !shouldDelete;
        });

        return newArray;
      });

      queryClient.setQueryData<number>(["usedStorage"], (old = 0) => {
        const newValue = old - (cleanedStorage ?? 0);

        return newValue;
      });
    },
    onError: () => {
      queryClient.setQueryData<any[]>(queryKey, (old = []) =>
        old.map((item) =>
          globalUuids.includes(item.uuid)
            ? { ...item, isOptimistic: false }
            : item,
        ),
      );

      addToast({
        title: "Deletion Failed",
        description: "Unable to delete file, please try again",
        color: "danger",
      });
    },
  });
};
