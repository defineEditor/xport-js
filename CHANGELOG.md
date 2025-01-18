# 0.2.2
- Dependency update, fixing a bug in the filters

# 0.2.1
- Fixed an issue in getData when header row was read in case skipHeader is not specified (default is true)
- Updated getRecordsNum for better row estimation
- Add roundingPrecision option in getData and read methods
- Exporting declarations

# 0.2.0

- Breaking change. Updated getData method to use a different way to provide parameters
- Added filtering of the data (in getData method)
- Added getRecordsNum method in Member class to calculate number of records in member (still only one dataset per XPT file is supported)
- Added format option to getMetadata method to return metadata in a Dataset-JSON 1.1 format
- Added XPT file header parsing and getHeader method
- Added some testing
- Updated dependencies (added js-stream-dataset-json only for type references)
- Updated to Eslint 9