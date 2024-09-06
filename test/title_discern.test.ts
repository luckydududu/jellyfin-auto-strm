import {NamingRule} from "../src/types";
import {discernTitleWithRule} from "../src/title_discern";
import {FileInfo} from "../src/source_provider";

test('title_year_scan_format', () => {
    const fileInfo: FileInfo = {
        filename: 'Inception.2010.1080p.BluRay.x264-Group.mkv',
        filePath: '',
        visitUrl: '',
        source: {type: '', path: '', server_address: '', name: ''}
    };
    const rule: NamingRule = {
        regex: '(?<title>.+?)\\.(?<year>19[0-9]{2}|20[0-2][0-9]|2030)\\..*',
        name: '',
        supported_media_types: ['movie'],
        example: ''
    };
    expect(discernTitleWithRule(fileInfo, rule, 'movie')?.match).toEqual(true);
});

test('title_year_nonengtitle_format', () => {
    const fileInfo: FileInfo = {
        filename: 'Assassins.1995.刺客战场.双语字幕.HR-HDTV.AC3.1024x576.x264-人人影视制作.mkv',
        filePath: '',
        visitUrl: '',
        source: {type: '', path: '', server_address: '', name: ''}
    };
    const rule: NamingRule = {
        regex: '(?<title>[\\w.]+)\\.(?<year>19[0-9]{2}|20[0-2][0-9]|2030)\\.(?<nonengtitle>[\u4e00-\u9fa5]+)\\.(?<subtitle>[\u4e00-\u9fa5]{2}字幕)\\..*',
        name: '',
        supported_media_types: ['movie'],
        example: ''
    };
    expect(discernTitleWithRule(fileInfo, rule, 'movie')?.match).toEqual(true);
});
