CREATE TABLE "Users" (
  "_id" int PRIMARY KEY,
  "email" varchar UNIQUE,
  "password" varchar,
  "name" varchar,
  "phone" varchar,
  "gender" varchar,
  "address" varchar,
  "accountType" varchar,
  "role" varchar,
  "avatar" varchar,
  "isDeleted" boolean,
  "isActive" boolean,
  "codeId" varchar,
  "codeExpired" datetime
);

CREATE TABLE "Branches" (
  "_id" int PRIMARY KEY,
  "code" varchar,
  "name" varchar,
  "address" varchar,
  "city" varchar,
  "province" varchar,
  "postalCode" varchar,
  "phone" varchar,
  "email" varchar
);

CREATE TABLE "Services" (
  "_id" int PRIMARY KEY,
  "code" varchar,
  "name" varchar,
  "description" text,
  "basePrice" decimal,
  "pricePerKg" decimal,
  "estimatedDays" int,
  "codFeePercent" decimal,
  "isActive" boolean
);

CREATE TABLE "Shipments" (
  "_id" int PRIMARY KEY,
  "trackingNumber" varchar UNIQUE,
  "senderName" varchar,
  "senderPhone" varchar,
  "senderAddress" varchar,
  "receiverName" varchar,
  "receiverPhone" varchar,
  "receiverAddress" varchar,
  "originBranchId" int,
  "destinationBranchId" int,
  "weight" decimal,
  "serviceType" varchar,
  "shippingFee" decimal,
  "status" varchar,
  "createdBy" int
);

CREATE TABLE "Orders" (
  "_id" int PRIMARY KEY,
  "userId" int,
  "senderName" varchar,
  "receiverName" varchar,
  "receiverPhone" varchar,
  "pickupAddress" varchar,
  "deliveryAddress" varchar,
  "totalPrice" decimal,
  "status" varchar
);

CREATE TABLE "Payments" (
  "_id" int PRIMARY KEY,
  "orderId" int,
  "shipmentId" int,
  "userId" int,
  "method" varchar,
  "amount" decimal,
  "status" varchar,
  "provider" varchar
);

CREATE TABLE "Trackings" (
  "_id" int PRIMARY KEY,
  "shipmentId" int,
  "status" varchar,
  "location" varchar,
  "note" text,
  "branchId" int,
  "timestamp" datetime
);

CREATE TABLE "Notifications" (
  "_id" int PRIMARY KEY,
  "recipient" varchar,
  "title" varchar,
  "message" text,
  "type" varchar,
  "status" varchar,
  "relatedShipmentId" varchar,
  "relatedOrderId" varchar
);

CREATE TABLE "Pricing" (
  "_id" int PRIMARY KEY,
  "serviceId" int,
  "zone" varchar,
  "minWeight" decimal,
  "maxWeight" decimal,
  "price" decimal,
  "isActive" boolean
);

ALTER TABLE "Shipments" ADD FOREIGN KEY ("originBranchId") REFERENCES "Branches" ("_id");

ALTER TABLE "Shipments" ADD FOREIGN KEY ("destinationBranchId") REFERENCES "Branches" ("_id");

ALTER TABLE "Shipments" ADD FOREIGN KEY ("createdBy") REFERENCES "Users" ("_id");

ALTER TABLE "Orders" ADD FOREIGN KEY ("userId") REFERENCES "Users" ("_id");

ALTER TABLE "Payments" ADD FOREIGN KEY ("orderId") REFERENCES "Orders" ("_id");

ALTER TABLE "Payments" ADD FOREIGN KEY ("shipmentId") REFERENCES "Shipments" ("_id");

ALTER TABLE "Payments" ADD FOREIGN KEY ("userId") REFERENCES "Users" ("_id");

ALTER TABLE "Trackings" ADD FOREIGN KEY ("shipmentId") REFERENCES "Shipments" ("_id");

ALTER TABLE "Trackings" ADD FOREIGN KEY ("branchId") REFERENCES "Branches" ("_id");

ALTER TABLE "Pricing" ADD FOREIGN KEY ("serviceId") REFERENCES "Services" ("_id");

ALTER TABLE "Pricing" ADD FOREIGN KEY ("zone") REFERENCES "Pricing" ("_id");
