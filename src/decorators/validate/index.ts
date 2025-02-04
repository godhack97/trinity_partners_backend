import {
  ArrayContains,
  ArrayMaxSize,
  ArrayMinSize, ArrayNotContains, ArrayNotEmpty,
  ArrayUnique, Contains, Equals, IsAlpha, IsAlphanumeric, IsArray, IsAscii, IsBase32, IsBase64,
  IsBIC,
  IsBoolean,
  IsBooleanString,
  IsBtcAddress,
  IsByteLength,
  IsCreditCard,
  IsCurrency,
  IsDataURI,
  IsDate,
  IsDateString,
  IsDecimal, IsDefined,
  IsEAN,
  IsEmail, IsEmpty,
  IsEnum,
  IsEthereumAddress,
  IsFirebasePushId,
  IsFQDN,
  IsFullWidth, IsHalfWidth,
  IsHash,
  IsHexadecimal,
  IsHexColor,
  IsHSL,
  IsIBAN,
  IsIdentityCard, IsIn, IsInstance, IsInt, IsIP, IsISBN, IsISIN,
  IsISO31661Alpha2,
  IsISO31661Alpha3,
  IsISO8601, IsISRC,
  IsISSN,
  IsJSON,
  IsJWT,
  IsLatitude,
  IsLatLong, IsLocale,
  IsLongitude,
  IsLowercase, IsMagnetURI, IsMilitaryTime, IsMimeType,
  IsMobilePhone,
  IsMongoId,
  IsNegative,
  IsNotEmpty,
  IsNotEmptyObject, IsNotIn,
  IsNumber,
  IsNumberString, IsObject, IsOctal, IsPassportNumber,
  IsPhoneNumber,
  IsPort,
  IsPositive,
  IsPostalCode, IsRFC3339, IsRgbColor,
  IsSemVer,
  IsString, IsSurrogatePair, IsUppercase, IsUrl, IsUUID, IsVariableWidth, Length, Matches, Max,
  MaxDate, MaxLength, Min,
  MinDate,
  MinLength, NotContains, NotEquals,
  ValidateNested
} from "class-validator";
import { ValidationOptions } from "class-validator/types/decorator/ValidationOptions";
import * as ValidatorJS from "validator";
import { message } from "./translate-ru";
import { IsNumberOptions } from "class-validator/types/decorator/typechecker/IsNumber";
import { CountryCode } from "libphonenumber-js/max";
import { IsIpVersion } from "class-validator/types/decorator/string/IsIP";
import { IsISBNVersion } from "class-validator/types/decorator/string/IsISBN";

export const MaxDateRu = (date: Date | (() => Date), validationOptions?: ValidationOptions): PropertyDecorator => {
  return MaxDate(date, {
    ...validationOptions,
    message: message.MaxDate
  });
};
export const MinDateRu = (date: Date | (() => Date), validationOptions?: ValidationOptions): PropertyDecorator => {
  return MinDate(date, {
    ...validationOptions,
    message: message.MinDate
  });
};
export const IsDecimalRu = (options?: ValidatorJS.IsDecimalOptions, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsDecimal(options, {
    ...validationOptions,
    message: message.IsDecimal
  });
};
export const IsBICRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsBIC({
    ...validationOptions,
    message: message.IsBIC
  });
};
export const IsBooleanStringRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsBooleanString({
    ...validationOptions,
    message: message.IsBooleanString
  });
};
export const IsBooleanRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsBoolean({
    ...validationOptions,
    message: message.IsBoolean
  });
};
export const IsBtcAddressRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsBtcAddress({
    ...validationOptions,
    message: message.IsBtcAddress
  });
};
export const IsCreditCardRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsCreditCard({
    ...validationOptions,
    message: message.IsCreditCard
  });
};
export const IsCurrencyRu = (options?: ValidatorJS.IsCurrencyOptions, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsCurrency(options, {
    ...validationOptions,
    message: message.IsCurrency
  });
};
export const IsDataURIRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsDataURI({
    ...validationOptions,
    message: message.IsDataURI
  });
};
export const IsDateRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsDate({
    ...validationOptions,
    message: message.IsDate
  });
};
export const IsFirebasePushIdRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsFirebasePushId({
    ...validationOptions,
    message: message.IsFirebasePushId
  });
};
export const IsHashRu = (algorithm: string, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsHash(algorithm, {
    ...validationOptions,
    message: message.IsHash
  });
};
export const IsHexColorRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsHexColor({
    ...validationOptions,
    message: message.IsHexColor
  });
};
export const IsHexadecimalRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsHexadecimal({
    ...validationOptions,
    message: message.IsHexadecimal
  });
};
export const IsHSLRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsHSL({
    ...validationOptions,
    message: message.IsHSL
  });
};
export const IsIdentityCardRu = (locale?: ValidatorJS.IdentityCardLocale, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsIdentityCard(locale, {
    ...validationOptions,
    message: message.IsIdentityCard
  });
};
export const IsISSNRu = (options?: ValidatorJS.IsISSNOptions, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsISSN(options, {
    ...validationOptions,
    message: message.IsISSN
  });
};
export const IsJSONRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsJSON({
    ...validationOptions,
    message: message.IsJSON
  });
};
export const IsJWTRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsJWT({
    ...validationOptions,
    message: message.IsJWT
  });
};
export const IsLatitudeRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsLatitude({
    ...validationOptions,
    message: message.IsLatitude
  });
};
export const IsLatLongRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsLatLong({
    ...validationOptions,
    message: message.IsLatLong
  });
};
export const IsLongitudeRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsLongitude({
    ...validationOptions,
    message: message.IsLongitude
  });
};
export const IsLowercaseRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsLowercase({
    ...validationOptions,
    message: message.IsLowercase
  });
};
export const IsMongoIdRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsMongoId({
    ...validationOptions,
    message: message.IsMongoId
  });
};
export const IsNegativeRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsNegative({
    ...validationOptions,
    message: message.IsNegative
  });
};
export const IsNotEmptyObjectRu = (options?: {
  nullable?: boolean
}, validationOptions ?: ValidationOptions): PropertyDecorator => {
  return IsNotEmptyObject(options, {
    ...validationOptions,
    message: message.IsNotEmptyObject
  });
};
export const IsNumberRu = (options?: IsNumberOptions, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsNumber(options, {
    ...validationOptions,
    message: message.IsNumber
  });
};
export const IsNumberStringRu = (options?: ValidatorJS.IsNumericOptions, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsNumberString(options, {
    ...validationOptions,
    message: message.IsNumberString
  });
};
export const IsMobilePhoneRu = (locale?: ValidatorJS.MobilePhoneLocale, options?: ValidatorJS.IsMobilePhoneOptions, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsMobilePhone(locale, options, {
    ...validationOptions,
    message: message.IsMobilePhone
  });
};
export const IsPortRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsPort({
    ...validationOptions,
    message: message.IsPort
  });
};
export const IsPositiveRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsPositive({
    ...validationOptions,
    message: message.IsPositive
  });
};
export const IsPostalCodeRu = (locale?: "any" | ValidatorJS.PostalCodeLocale, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsPostalCode(locale, {
    ...validationOptions,
    message: message.IsPostalCode
  });
};
export const IsSemVerRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsSemVer({
    ...validationOptions,
    message: message.IsSemVer
  });
};
export const IsStringRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsString({
    ...validationOptions,
    message: message.IsString
  });
};
export const IsFQDNRu = (options?: ValidatorJS.IsFQDNOptions, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsFQDN(options, {
    ...validationOptions,
    message: message.IsFQDN
  });
};
export const IsEnumRu = (entity: object, validationOptions?: ValidationOptions): PropertyDecorator => {
  Object.defineProperty(entity, "toString", {
    value () {
      return Object.values(this).toString()
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
  return IsEnum(entity, {
    ...validationOptions,
    message: `${message.IsEnum} ${entity.toString()}`
  });
};
export const IsDateStringRu = (options?: ValidatorJS.IsISO8601Options, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsDateString(options, {
    ...validationOptions,
    message: message.IsDateString
  });
};
export const IsISO8601Ru = (options?: ValidatorJS.IsISO8601Options, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsISO8601(options, {
    ...validationOptions,
    message: message.IsISO8601
  });
};
export const IsISO31661Alpha2Ru = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsISO31661Alpha2({
    ...validationOptions,
    message: message.IsISO31661Alpha2
  });
};
export const IsISO31661Alpha3Ru = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsISO31661Alpha3({
    ...validationOptions,
    message: message.IsISO31661Alpha3
  });
};
export const IsPhoneNumberRu = (region?: CountryCode, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsPhoneNumber(region, {
    ...validationOptions,
    message: message.IsPhoneNumber
  });
};
export const IsMilitaryTimeRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsMilitaryTime({
    ...validationOptions,
    message: message.IsMilitaryTime
  });
};
export const IsArrayRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsArray({
    ...validationOptions,
    message: message.IsArray
  });
};
export const IsEANRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsEAN({
    ...validationOptions,
    message: message.IsEAN
  });
};
export const IsEmailRu = (options?: ValidatorJS.IsEmailOptions, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsEmail(options, {
    message: 'Поле должно быть электронной почтой!',
    ...validationOptions
  });
};
export const IsEthereumAddressRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsEthereumAddress({
    ...validationOptions,
    message: message.IsEthereumAddress
  });
};
export const IsIBANRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsIBAN({
    ...validationOptions,
    message: message.IsIBAN
  });
};
export const IsInstanceRu = (targetType: new (...args: any[]) => any, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsInstance(targetType, {
    ...validationOptions,
    message: message.IsInstance
  });
};
export const IsIntRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsInt({
    ...validationOptions,
    message: message.IsInt
  });
};
export const IsIPRu = (version?: IsIpVersion, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsIP(version, {
    ...validationOptions,
    message: message.IsIP
  });
};
export const IsISBNRu = (version?: IsISBNVersion, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsISBN(version, {
    ...validationOptions,
    message: message.IsISBN
  });
};
export const IsISINRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsISIN({
    ...validationOptions,
    message: message.IsISIN
  });
};
export const IsISRCRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsISRC({
    ...validationOptions,
    message: message.IsISRC
  });
};
export const IsObjectRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsObject({
    ...validationOptions,
    message: message.IsObject
  });
};
export const IsUrlRu = (options?: ValidatorJS.IsURLOptions, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsUrl(options, {
    ...validationOptions,
    message: message.IsUrl
  });
};
export const IsUUIDRu = (version?: ValidatorJS.UUIDVersion, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsUUID(version, {
    ...validationOptions,
    message: message.IsUUID
  });
};
export const IsBase32Ru = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsBase32({
    ...validationOptions,
    message: message.IsBase32
  });
};
export const IsBase64Ru = (options?: ValidatorJS.IsBase64Options, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsBase64(options, {
    ...validationOptions,
    message: message.IsBase64
  });
};
export const IsEmptyRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsEmpty({
    ...validationOptions,
    message: message.IsEmpty
  });
};
export const EqualsRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return Equals({
    ...validationOptions,
    message: message.Equals
  });
};
export const IsLocaleRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsLocale({
    ...validationOptions,
    message: message.IsLocale
  });
};
export const MinLengthRu = (min: number, validationOptions?: ValidationOptions): PropertyDecorator => {
  return MinLength(min, {
    ...validationOptions,
    message: message.MinLength
  });
};
export const IsMagnetURIRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsMagnetURI({
    ...validationOptions,
    message: message.IsMagnetURI
  });
};
export const IsMimeTypeRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsMimeType({
    ...validationOptions,
    message: message.IsMimeType
  });
};
export const IsInRu = (values: readonly any[], validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsIn(values, {
    ...validationOptions,
    message: message.IsIn
  });
};
export const IsRFC3339Ru = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsRFC3339({
    ...validationOptions,
    message: message.IsRFC3339
  });
};
export const IsRgbColorRu = (includePercentValues?: boolean, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsRgbColor(includePercentValues, {
    ...validationOptions,
    message: message.IsRgbColor
  });
};
export const MaxLengthRu = (max: number, validationOptions?: ValidationOptions): PropertyDecorator => {
  return MaxLength(max, {
    ...validationOptions,
    message: message.MaxLength
  });
};
export const LengthRu = (min: number, max?: number, validationOptions?: ValidationOptions): PropertyDecorator => {
  return Length(min, max, {
    ...validationOptions,
    message: message.Length
  });
};
export const IsUppercaseRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsUppercase({
    ...validationOptions,
    message: message.IsUppercase
  });
};
export const IsOctalRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsOctal({
    ...validationOptions,
    message: message.IsOctal
  });
};
export const IsPassportNumberRu = (countryCode: string, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsPassportNumber(countryCode, {
    ...validationOptions,
    message: message.IsPassportNumber
  });
};
export const ArrayContainsRu = (values: any[], validationOptions?: ValidationOptions): PropertyDecorator => {
  return ArrayContains(values, {
    ...validationOptions,
    message: message.ArrayContains
  });
};
export const ContainsRu = (seed: string, validationOptions?: ValidationOptions): PropertyDecorator => {
  return Contains(seed, {
    ...validationOptions,
    message: message.Contains
  });
};
export const IsVariableWidthRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsVariableWidth({
    ...validationOptions,
    message: message.IsVariableWidth
  });
};
export const IsFullWidthRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsFullWidth({
    ...validationOptions,
    message: message.IsFullWidth
  });
};
export const IsHalfWidthRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsHalfWidth({
    ...validationOptions,
    message: message.IsHalfWidth
  });
};
export const IsSurrogatePairRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsSurrogatePair({
    ...validationOptions,
    message: message.IsSurrogatePair
  });
};
export const ArrayMinSizeRu = (min: number, validationOptions?: ValidationOptions): PropertyDecorator => {
  return ArrayMinSize(min, {
    ...validationOptions,
    message: message.ArrayMinSize
  });
};
export const ArrayMaxSizeRu = (max: number, validationOptions?: ValidationOptions): PropertyDecorator => {
  return ArrayMaxSize(max, {
    ...validationOptions,
    message: message.ArrayMaxSize
  });
};
export const IsAsciiRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsAscii({
    ...validationOptions,
    message: message.IsAscii
  });
};
export const IsAlphaRu = (locale?: ValidatorJS.AlphaLocale, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsAlpha(locale, {
    ...validationOptions,
    message: message.IsAlpha
  });
};
export const IsAlphanumericRu = (locale?: ValidatorJS.AlphanumericLocale, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsAlphanumeric(locale, {
    ...validationOptions,
    message: message.IsAlphanumeric
  });
};
export const MatchesRu = (pattern: RegExp, validationOptions?: ValidationOptions): PropertyDecorator => {
  return Matches(pattern, {
    ...validationOptions,
    message: message.Matches
  });
};

export const MaxRu = (maxValue: number, validationOptions?: ValidationOptions): PropertyDecorator => {
  return Max(maxValue, {
    ...validationOptions,
    message: message.Max
  });
};
export const MinRu = (minValue: number, validationOptions?: ValidationOptions): PropertyDecorator => {
  return Min(minValue, {
    ...validationOptions,
    message: message.Min
  });
};
export const ArrayNotEmptyRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return ArrayNotEmpty({
    ...validationOptions,
    message: message.ArrayNotEmpty
  });
};
export const IsNotEmptyRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsNotEmpty({
    ...validationOptions,
    message: message.IsNotEmpty
  });
};
export const NotEqualsRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return NotEquals({
    ...validationOptions,
    message: message.NotEquals
  });
};
export const IsDefinedRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsDefined({
    ...validationOptions,
    message: message.IsDefined
  });
};
export const IsNotInRu = (values: readonly any[], validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsNotIn(values, {
    ...validationOptions,
    message: message.IsNotIn
  });
};
export const ArrayNotContainsRu = (values: any[], validationOptions?: ValidationOptions): PropertyDecorator => {
  return ArrayNotContains(values, {
    ...validationOptions,
    message: message.ArrayNotContains
  });
};
export const NotContainsRu = (seed: string, validationOptions?: ValidationOptions): PropertyDecorator => {
  return NotContains(seed, {
    ...validationOptions,
    message: message.NotContains
  });
};
export const IsByteLengthRu = (min: number, max?: number, validationOptions?: ValidationOptions): PropertyDecorator => {
  return IsByteLength(min, max, {
    ...validationOptions,
    message: message.IsByteLength
  });
};
export const ArrayUniqueRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return ArrayUnique({
    ...validationOptions,
    message: message.ArrayUnique
  });
};
export const ValidateNestedRu = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return ValidateNested({
    ...validationOptions,
    message: message.ValidateNested
  });
};
