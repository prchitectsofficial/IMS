# PHP IMS App Analysis

## Table Relationships

### Main Tables Used:
1. **channel_data** / **light_ims** - Main influencer data (Elasticsearch index: `bmi_light_ims`)
2. **adminnotes** - Separate table for admin notes (linked by `channel_id`)
3. **channel_social** - Social media links (linked by `channel`)
4. **language_with_shortcode** - Language codes mapping
5. **user_country** - Country list
6. **exchange_rate** - Currency conversion rates
7. **category_heads** - Category/tag names

## Key Findings

### 1. Status Values (confirmed column)
- 1 = Unconfirmed
- 2 = Auto Mail
- 3 = Manual Mail
- 4 = Responded
- 5 = Confirmed
- 6 = Managed
- 7 = Suspended
- 9 = BMI
- 10 = Confirmed PPC

**Default Filter**: `confirmed IN [5,6,9,10]` (Confirmed, Managed, BMI, Confirmed PPC)

### 2. Admin Notes Structure
- Separate table: `adminnotes`
- Linked by: `channel_id` (not `id`)
- Fields: `id`, `channel_id`, `note`, `created_at`, etc.
- Summary stats count from `adminnotes` table, not from main table

### 3. Search Functionality
- Multiple search types:
  - Search by channel name
  - Search by channel email
  - Search keyword in tags only
  - Search by channel code
- Complex filters: price ranges, views, managed_by, language, email, date, barter, promo_price, management_level

### 4. Social Links
- Stored in `channel_social` table
- Field: `sociallinks` (JSON)
- Retrieved via `getsocial()` function

### 5. Currency Conversion
- Uses `exchange_rate` table
- Converts USD/EURO to INR for display
- Fields: `base_currency`, `inr`

### 6. Similar Channels
- Based on `top_two_tags` matching
- Query: `WHERE top_two_tags = ? AND id != ?`

### 7. Summary Stats
- Total Influencers: Count from main table
- Total Comments: Count from `adminnotes` table
- Channels with Comments: Distinct count from `adminnotes` table

## Required Updates

1. **Admin Notes**: Use separate `adminnotes` table instead of columns in main table
2. **Summary Stats**: Query `adminnotes` table for comment counts
3. **Status Values**: Add support for values 9 (BMI) and 10 (Confirmed PPC)
4. **Default Filter**: Apply `confirmed IN [5,6,9,10]` as default
5. **Social Links**: Add endpoint to fetch from `channel_social` table
6. **Currency**: Add currency conversion support
7. **Languages**: Use `language_with_shortcode` table for language list
8. **Countries**: Use `user_country` table for country list

