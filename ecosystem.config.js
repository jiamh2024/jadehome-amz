// www.javascriptcn.com code example
// ecosystem.config.js
module.exports = {
    apps: [
        {
            name: 'jadehome-amz',
            script: './bin/www',
            env: {
                NODE_ENV: 'development',
                PORT: 3000,
                DB_HOST: 'localhost',
                MESSAGE: 'Hello, Development!'
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 8000,
                DB_HOST: 'localhost',
                SP_API_CLIENT_ID:'amzn1.application-oa2-client.339935649df34b15b3e1c406108507ea',
                SP_API_CLIENT_SECRET: 'amzn1.oa2-cs.v1.539b8fcf67acc25d99fbecfc05f4b9b56754b447a1c79fd2c25665d8a1b25ea3',
                SP_API_REFRESH_TOKEN_NA: 'Atzr|IwEBIIMKHdwRtc6ljRClvAxLVFPub_NBuBGuzc80npwNpu3wmlS3Jwx1TMEbjS2XnvKpVDoq8ehulYWkAFIYEi4l5rQYyYmlERzs8Ez1cGYSkYKsQLO5czLJ6V3Nw0WHx4fxQKe--XAjYxnqXOG2awVGx-k1IFfIccu-2cu6oFPtWrygWWvzghlPL3W4Kh8PEGmsEdtMJzTzyZvOFbHVykTAREdigeqmHqVN9oAV4x9aZ5Ho2YOwdopk1_9TnuGnnNmCtkLIMvFlruy1siIg9JIHjryhorDvZMSlV5fLuwILato76_1Gr6gVy0hCt2wKKh3CJf8',
                SP_API_REFRESH_TOKEN_ER: 'Atzr|IwEBIElNwMBAFcwz9VvoD4gsbq1KezKh8AgDAH6ZeBNl34GHmqEhf8BAUfvibI4BSVB3stBIb_PJm4TVF0MuaDSaNiWcs7kIBzIUzhl-udbFit-NaBumpeK13_LD0jNpg6f2bkMcWtfz-9V_q31e5EIy2cGtIRrfRLAB45WxMUNBt0-uwasG0jD2GS9ZtGTCKmb7tfxqtl_S_3L5CjL8cwpKFz_r4Pg6nIoFM-7vhYeSVNPBCw7l1Pwjca-iuWCgbQx2bfoE5cX-1L6AzDiaPpSHT_UfXZBLGuRh9HHVxQwruN3Fl3AG9_QwUJF2G9aGSUuIOCc',
                SP_API_REFRESH_TOKEN_AE: 'Atzr|IwEBIKCI3S_b8S08kwDP39kYfvE2JJca4fkMONY_QG9sLN8h5kz1OUBZi3io9nPFnPGsp_n3PgKk34LfKh8nvoCIoGOVVc7g7cAW_NNyITC_3A99zPJv4NzAIQ9UmdQpHfOlsePJMP1QnmQjZiTVXJXQyI8vktZaKpA41vUDvsCJC-VXOvMYDRYmDUFDWYBufvK1-Rxfurin0UCL_H4zR4ef_9KlGYTu78hnVIDpqcF1rwYUob7jXzsSrp4P3kEk_DONW3Pf4nldhYN7aXdGEjtqgelCLmWZud5ox0UFr8GmkeGts6ANB4MA3tVvip3v8EMjvd8WR1MCFWhnbem1cZyVvgL_',
                SP_API_REFRESH_TOKEN_SA: 'Atzr|IwEBIKCI3S_b8S08kwDP39kYfvE2JJca4fkMONY_QG9sLN8h5kz1OUBZi3io9nPFnPGsp_n3PgKk34LfKh8nvoCIoGOVVc7g7cAW_NNyITC_3A99zPJv4NzAIQ9UmdQpHfOlsePJMP1QnmQjZiTVXJXQyI8vktZaKpA41vUDvsCJC-VXOvMYDRYmDUFDWYBufvK1-Rxfurin0UCL_H4zR4ef_9KlGYTu78hnVIDpqcF1rwYUob7jXzsSrp4P3kEk_DONW3Pf4nldhYN7aXdGEjtqgelCLmWZud5ox0UFr8GmkeGts6ANB4MA3tVvip3v8EMjvd8WR1MCFWhnbem1cZyVvgL_',
                MESSAGE: 'Hello, Production!'
            }
        }
    ]
}