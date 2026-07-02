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
    { icon: "cart-outline",                       name: "Groceries"       },
    { icon: "bag-handle-outline",                 name: "Shopping"        },
    { icon: "car-outline",                        name: "Transport"       },
    { icon: "flash-outline",                      name: "Bills"           },
    { icon: "home-outline",                       name: "Rent & Housing"  },
    { icon: "people-outline",                     name: "People"          },
    { icon: "school-outline",                     name: "Education"       },
    { icon: "repeat-outline",                     name: "Subscriptions"   },
    { icon: "game-controller-outline",            name: "Entertainment"   },
    { icon: "medkit-outline",                     name: "Health"          },
    { icon: "barbell-outline",                    name: "Personal Care"   },
    { icon: "paw-outline",                        name: "Pets"            },
    { icon: "airplane-outline",                   name: "Travel"          },
    { icon: "gift-outline",                       name: "Gifts & Donations" },
    { icon: "ellipsis-horizontal-circle-outline", name: "Others"          },
  ],
  Income: [
    { icon: "briefcase-outline",                  name: "Salary"          },
    { icon: "laptop-outline",                     name: "Freelance"       },
    { icon: "storefront-outline",                 name: "Business"        },
    { icon: "trending-up-outline",                name: "Investment"      },
    { icon: "home-outline",                       name: "Rental"          },
    { icon: "people-outline",                     name: "People"          },
    { icon: "gift-outline",                       name: "Gift"            },
    { icon: "return-down-back-outline",           name: "Refund"          },
    { icon: "ribbon-outline",                     name: "Bonus"           },
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
