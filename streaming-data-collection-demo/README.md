## Chapter 3: (Demo) Streaming Data Collection

### Scenario

You work for a company who has thousands of users interacting with the company's applcation. You have been tasked with capturing real-time data about the users for a marketing campaign. You need to capture information like name, age, gender, and location for users who are 21 and older.

### Tasks

- User the randomuser.me API to generate random user data
- Filter out users that aren't 21 years old and strip out unwanted data (not first name, last name, age, gender, latitude, longitude)
- Save the results as JSON files in S3

### Solution

- (To challenge myself, I created all of this using CDK, not Serverless Framework which I'm more familiar with )

### Notes:

- (RETURN SHAPE)
- (GZIP COMPRESSION)
- (CALLED RECORDS)
- BATCHES & Delimited with \\n
