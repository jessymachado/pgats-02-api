// Bibliotecas
const request = require('supertest');
const { expect } = require('chai');



describe('Transfer External GraphQL', () => {
    let token;

    before(async () => {        
        const loginMutation = {
            query: `mutation Login($username: String!, $password: String!) {
                loginUser(username: $username, password: $password) {
                    token
                }
            }`,
            variables: {
                username: 'julio',
                password: '123456'
            }
        };
        const res = await request('http://localhost:4000')
            .post('/graphql')
            .send(loginMutation);
        token = res.body.data.loginUser.token;
    });

    it('Quando informo valores válidos via GraphQL, tenho sucesso', async () => {
        const transferMutation = {
            query: `mutation Transfer($from: String!, $to: String!, $value: Float!) {
                createTransfer(from: $from, to: $to, value: $value) {
                    from
                    to
                    value
                    date
                }
            }`,
            variables: {
                from: 'julio',
                to: 'priscila',
                value: 150
            }
        };
        const resposta = await request('http://localhost:4000')
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(transferMutation);

        expect(resposta.status).to.equal(200);

        
        const respostaEsperada = require('../fixture/respostas/quandoInformoValoresValidosViaGraphQlTenhoSucesso.json')
        
        const dataRetornada = resposta.body.data.createTransfer.date;
        expect(dataRetornada).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

        delete resposta.body.data.createTransfer.date;
        delete respostaEsperada.data.createTransfer.date; 
        expect(resposta.body).to.deep.equal(respostaEsperada);

       // console.log(resposta.body)
    });


    it('Quando informo saldo acima do valor disponível, válidos via GraphQL, recebo validação de limite até para não favorecidos', async () => {
        const transferMutation = {
            query: `mutation Transfer($from: String!, $to: String!, $value: Float!) {
                createTransfer(from: $from, to: $to, value: $value) {
                    from
                    to
                    value
                    date
                }
            }`,
            variables: {
                from: 'julio',
                to: 'jessica',
                value: 5000.01
            }
        };
        const resposta = await request('http://localhost:4000')
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(transferMutation);

        expect(resposta.status).to.equal(200);
        expect(resposta.body.errors).to.be.an('array');
        const mensagem = resposta.body.errors[0].message;

        console.log(resposta.body)
        // Pode ser "Token não fornecido." ou "Autenticação obrigatória" dependendo do resolver
        expect(mensagem).to.equal('Transferência acima de R$ 5.000,00 só para favorecidos');
    });

    it('Quando tento listar transferências sem token, recebo erro de autenticação', async () => {
        const query = {
            query: `query { transfers { from to value date } }`
        };
        const resposta = await request('http://localhost:4000')
            .post('/graphql')
            .send(query);

        // Apollo retorna 200 mas o erro está em resposta.body.errors
        expect(resposta.status).to.equal(200);
        expect(resposta.body.errors).to.be.an('array');
        const mensagem = resposta.body.errors[0].message;
        // Pode ser "Token não fornecido." ou "Autenticação obrigatória" dependendo do resolver
        expect(mensagem).to.match(/Token não fornecido|Autenticação obrigatória/);
    });

});