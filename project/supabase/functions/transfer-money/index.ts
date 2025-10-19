import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      const { recipientPhone, amount, description } = await req.json();

      if (!recipientPhone || !amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid transfer details' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: recipient, error: recipientError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', recipientPhone)
        .maybeSingle();

      if (recipientError) throw recipientError;
      if (!recipient) {
        return new Response(
          JSON.stringify({ error: 'Recipient not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (recipient.id === user.id) {
        return new Response(
          JSON.stringify({ error: 'Cannot transfer to yourself' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: senderWallet, error: senderWalletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (senderWalletError) throw senderWalletError;
      if (!senderWallet) {
        return new Response(
          JSON.stringify({ error: 'Sender wallet not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const senderBalance = parseFloat(senderWallet.balance);
      if (senderBalance < parseFloat(amount)) {
        return new Response(
          JSON.stringify({ error: 'Insufficient balance' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: recipientWallet, error: recipientWalletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', recipient.id)
        .maybeSingle();

      if (recipientWalletError) throw recipientWalletError;
      if (!recipientWallet) {
        return new Response(
          JSON.stringify({ error: 'Recipient wallet not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const recipientBalance = parseFloat(recipientWallet.balance);
      const transferAmount = parseFloat(amount);

      const newSenderBalance = senderBalance - transferAmount;
      const newRecipientBalance = recipientBalance + transferAmount;

      const { error: senderUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newSenderBalance })
        .eq('user_id', user.id);

      if (senderUpdateError) throw senderUpdateError;

      const { error: recipientUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newRecipientBalance })
        .eq('user_id', recipient.id);

      if (recipientUpdateError) {
        await supabase
          .from('wallets')
          .update({ balance: senderBalance })
          .eq('user_id', user.id);
        throw recipientUpdateError;
      }

      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          from_user_id: user.id,
          to_user_id: recipient.id,
          amount: transferAmount,
          type: 'transfer',
          status: 'completed',
          description: description || 'Money transfer',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (txError) throw txError;

      await supabase.from('transaction_history').insert([
        {
          transaction_id: transaction.id,
          user_id: user.id,
          wallet_balance_before: senderBalance,
          wallet_balance_after: newSenderBalance,
        },
        {
          transaction_id: transaction.id,
          user_id: recipient.id,
          wallet_balance_before: recipientBalance,
          wallet_balance_after: newRecipientBalance,
        },
      ]);

      return new Response(
        JSON.stringify({ success: true, transaction, newBalance: newSenderBalance }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});