// Bibliotecas
const request = require('supertest');
const { expect, use } = require('chai');
require('dotenv').config();

const chaiExclude = require('chai-exclude')
use(chaiExclude)



describe('Transfer External GraphQL', () => {
    let token;
    

    before(async () => {
        const loginUser = require('../fixture/requisicoes/login/loginUser.json')
        const res = await request(process.env.BASE_URL_GRAPHQL)
            .post('/graphql')
            .send(loginUser);
        token = res.body.data.loginUser.token;
    });

    it('Quando informo um valor acima do limite para favorecidos, porém considerando um não favorecido, recebo validação de limite', async () => {
        const createTransfer = require('../fixture/requisicoes/transferencias/payloadValoresExcedenteLimite.json')
        createTransfer.variables.value = 5001
        const resposta = await request(process.env.BASE_URL_GRAPHQL)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(createTransfer);

        expect(resposta.status).to.equal(200);

        //console.log(resposta.body)
        expect(resposta.body.errors).to.be.an('array');
        
        const mensagem = resposta.body.errors[0].message;
        expect(mensagem).to.equal('Transferência acima de R$ 5.000,00 só para favorecidos');
    });

    it('Quando informo valores válidos via GraphQL, tenho sucesso', async () => {
        const createTransfer = require('../fixture/requisicoes/transferencias/payloadValoresValidosSucessoTransferencia.json')
        createTransfer.variables.value = 150

        const respostaTransferencia = await request(process.env.BASE_URL_GRAPHQL)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(createTransfer);

        expect(respostaTransferencia.status).to.equal(200);        

        const dataRetornada = respostaTransferencia.body.data.createTransfer.date;
        expect(dataRetornada).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

        const respostaEsperada = require('../fixture/respostas/transferencias/quandoInformoValoresValidosViaGraphQlTenhoSucesso.json');
        expect(respostaTransferencia.status).to.equal(200);
        expect(respostaTransferencia.body.data.createTransfer)
            .excluding('date')
            .to.deep.equal(respostaEsperada.data.createTransfer);
    });



    it('Quando tento listar transferências sem token, recebo erro de autenticação', async () => {
        const query = {
            query: `query { transfers { from to value date } }`
        };
        const resposta = await request(process.env.BASE_URL_GRAPHQL)
            .post('/graphql')
            .send(query);

        expect(resposta.status).to.equal(200);
        expect(resposta.body.errors).to.be.an('array');
        const mensagem = resposta.body.errors[0].message;

        expect(mensagem).to.match(/Token não fornecido|Autenticação obrigatória/);
    });

    it('Quando informo um valor não disponível na conta para realizar a transferência', async () => {
        const respostaTransferencia = await request('http://localhost:4000/graphql')
            .post('')
            .set('Authorization', `Bearer ${token}`)
            .send({
                query: `
                    mutation CreateTransfer($from: String!, $to: String!, $value: Float!) {
                        createTransfer(from: $from, to: $to, value: $value) {
                            date
                            from
                            to
                            value
                        }
                    }
                `,
                variables: {
                    from: 'julio',
                    to: 'priscila',
                    value: 10001
                }
            });

        expect(respostaTransferencia.status).to.equal(200);
        expect(respostaTransferencia.body.errors).to.be.an('array');
        const mensagem = respostaTransferencia.body.errors[0].message;

        expect(mensagem).to.equal('Saldo insuficiente')

        //console.log(respostaTransferencia.body)

    });

});