import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  reports: defineTable({
    userId: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    officerName: v.string(),
    date: v.string(),
    designation: v.string(),
    area: v.string(),
    reportTypes: v.object({
      daily: v.boolean(),
      weekly: v.boolean(),
      monthly: v.boolean(),
      emergency: v.boolean(),
    }),
    maintenanceList: v.array(
      v.object({
        id: v.union(v.number(), v.string()),
        machineName: v.string(),
        location: v.string(),
        issue: v.string(),
        action: v.string(),
        status: v.string(),
        cost: v.union(v.number(), v.string()),
      })
    ),
    marketingList: v.array(
      v.object({
        id: v.union(v.number(), v.string()),
        clientName: v.string(),
        activity: v.string(),
        contactPerson: v.string(),
        result: v.string(),
        status: v.string(),
        cost: v.union(v.number(), v.string()),
      })
    ),
    travelList: v.array(
      v.object({
        id: v.union(v.number(), v.string()),
        fromLoc: v.string(),
        fromCustom: v.optional(v.string()),
        toLoc: v.string(),
        toCustom: v.optional(v.string()),
        transport: v.string(),
        purpose: v.string(),
        travelCost: v.union(v.number(), v.string()),
        otherCost: v.union(v.number(), v.string()),
      })
    ),
    foodCost: v.union(v.number(), v.string()),
    parcelCost: v.union(v.number(), v.string()),
    otherCost: v.union(v.number(), v.string()),
    remarks: v.string(),
    grandTotal: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),
});
