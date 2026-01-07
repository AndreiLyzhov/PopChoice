import { supabase } from '../utils/config.js';
import dns from 'dns';
import { promisify } from 'util';

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"})
    }
    const { embedding } = req.body;

    if (!embedding) {
        return res.status(400).json({ error: "Input is required" });
    }




    /*
    //Main supabase request
    try {
        
        const { data, error } = await supabase.rpc('match_films', {
            query_embedding: embedding,
            match_threshold: 0.50,
            match_count: 4
        })

        console.log(data)

        if (error) {
          console.error("Supabase RPC Error Details:", error);
          // We return the error message string, not the whole error object
          return res.status(500).json({ error: error.message || "Database query failed" });
      }
      
      console.log("succesfully found nearest")
  
      res.status(200).json({data});



    } catch (error) {
      res.status(500).json({ error: "Server Error while finding nearest: ", message: error.message });
    }
    */




    /*
    // Supabase simple test
    try {
        console.log("Пробую простую выборку вместо RPC...");
        const { data, error } = await supabase.from('films').select('id').limit(1);
        
        if (error) {
            console.log("Ошибка таблицы:", error.message);
        } else {
            console.log("Связь с таблицей есть! ID первой записи:", data[0]?.id);
            res.status(200).json({data})
        }
    } catch (e) {
        console.log("Ошибка запроса:", e.message);
    }
    */


    /*
    // Попытка заменить на raw fetch
    console.log("Запускаю RAW Fetch...");

    const rawResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/match_films`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_API_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_API_KEY}`
      },
      body: JSON.stringify({
        query_embedding: embedding, // твой массив векторов
        match_threshold: 0.50,
        match_count: 4
      })
    });

    console.log("Статус ответа:", rawResponse.status);

    if (!rawResponse.ok) {
        const text = await rawResponse.text();
        console.log("Ошибка Fetch:", text);
        throw new Error(text);
    }

    const size = rawResponse.headers.get('content-length');
    console.log("Размер ответа (байт):", size);

    // Попробуем прочитать текст, а не JSON сразу, чтобы не зависнуть на парсинге
    const resultText = await rawResponse.text(); 
    console.log("Длина ответа (символов):", resultText.length);
    // console.log("Ответ:", resultText); // Раскомментируй, если длина небольшая

    const data = JSON.parse(resultText);
    console.log("Успешно распарсили JSON!");
    */



    //Ping DB test
    console.log("Тестируем соединение с БД...");

    try {
        const { data, error } = await supabase.rpc('ping_db'); // Вызываем нашу пустышку

        if (error) {
            console.error("Ошибка RPC:", error);
        } else {
            console.log("УСПЕХ! Ответ от базы:", data);
        }
        
        // Обязательно ответь браузеру, чтобы он не висел
        return res.status(200).json({ test_result: data });

    } catch (e) {
        console.error("Критическая ошибка:", e);
        return res.status(500).json({ error: e.message });
    }






  }