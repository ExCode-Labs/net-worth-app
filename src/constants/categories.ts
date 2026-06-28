import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export type TxType = "Expense" | "Income" | "Transfer";

export const TX_TYPES: TxType[] = ["Expense", "Income", "Transfer"];

/** Per-type display color (hex) */
export const TX_TYPE_COLORS: Record<TxType, string> = {
  Expense:  "#f87171",
  Income:   "#4ade80",
  Transfer: "#3b82f6",
};

export interface Category {
  icon: IoniconName;
  name: string;
}

export const CATEGORIES: Record<TxType, Category[]> = {
  Expense: [
    { icon: "pizza-outline",                      name: "Food & Dining"   },
    { icon: "bag-handle-outline",                 name: "Shopping"        },
    { icon: "car-outline",                        name: "Transport"       },
    { icon: "flash-outline",                      name: "Bills"           },
    { icon: "game-controller-outline",            name: "Entertainment"   },
    { icon: "medkit-outline",                     name: "Health"          },
    { icon: "airplane-outline",                   name: "Travel"          },
    { icon: "ellipsis-horizontal-circle-outline", name: "Others"          },
  ],
  Income: [
    { icon: "briefcase-outline",                  name: "Salary"          },
    { icon: "laptop-outline",                     name: "Freelance"       },
    { icon: "trending-up-outline",                name: "Investment"      },
    { icon: "gift-outline",                       name: "Gift"            },
    { icon: "business-outline",                   name: "Interest"        },
    { icon: "ellipsis-horizontal-circle-outline", name: "Others"          },
  ],
  Transfer: [
    { icon: "business-outline",                   name: "Bank Transfer"   },
    { icon: "phone-portrait-outline",             name: "UPI"             },
    { icon: "card-outline",                       name: "Card Payment"    },
    { icon: "cash-outline",                       name: "Cash"            },
  ],
};
