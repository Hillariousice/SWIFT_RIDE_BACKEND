import { DataTypes, Model } from "sequelize";
import { db } from "../config";
export interface OrderAttribute {
  id: string;
  pickupLocation: string;
  packageDescription: string;
  dropOffLocation: string;
  dropOffPhoneNumber: string;
  offerAmount: number;
  paymentMethod: string;
  orderNumber: string;
  status: string;
  userId: string;
}
export class OrderInstance extends Model<OrderAttribute> {}
OrderInstance.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    pickupLocation: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: "pick up location is required",
        },
        notEmpty: {
          msg: "provide a pickup location",
        },
      },
    },
    packageDescription: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: "package description is required",
        },
        notEmpty: {
          msg: "provide package description",
        },
      },
    },
    dropOffLocation: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: "Drop of location is required",
        },
        notEmpty: {
          msg: "provide drop of location",
        },
      },
    },
    dropOffPhoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: "Drop off phone number is required",
        },
        notEmpty: {
          msg: "provide a drop off phone number",
        },
      },
    },
    offerAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    tableName: "order",
  }
);
