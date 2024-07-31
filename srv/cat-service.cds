using eSignature as my from '../db/data-model';

service CatalogService {
    entity Files as projection on my.Files;
    action doConvertCMSTOPDF(cms:LargeString) returns String;
    action mergePDF(cmsData:LargeString) returns LargeString;

}
